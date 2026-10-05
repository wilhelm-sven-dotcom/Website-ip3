<?php
/**
 * Versand des Kontaktformulars der Website www.ip3-energie.de.
 *
 * Voraussetzung: Webhosting mit PHP und konfigurierter mail()-Funktion.
 * Antwortet mit JSON (Abruf per JavaScript) oder leitet ohne JavaScript
 * auf /kontakt#anfrage-gesendet bzw. /kontakt#anfrage-fehler weiter.
 */

declare(strict_types=1);

// ---- Einstellungen -------------------------------------------------------
const EMPFAENGER = 'info@ip3-energie.de';
const ABSENDER = 'noreply@ip3-energie.de';
const ABSENDER_NAME = 'Website ip3-energie.de';
const MIN_SEKUNDEN = 3;          // Mindestzeit zwischen Seitenaufruf und Absenden
const MAX_SEKUNDEN = 86400;      // Formular höchstens einen Tag alt
const PRODUKTIV = ['www.ip3-energie.de', 'ip3-energie.de']; // auf allen anderen Adressen: Betreff mit [Test]
const INTERESSEN = [
    'Private PV-Anlage',
    'PV-Anlage für Industrie und Gewerbe',
    'PV-Anlage auf Freiflächen',
    'Batteriespeicher',
    'Sonstiges',
];
// ---------------------------------------------------------------------------

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$wantsJson = isset($_SERVER['HTTP_ACCEPT']) && strpos((string) $_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

function antwort(bool $ok, string $fehler = '', int $status = 200): void
{
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $fehler], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: /kontakt#' . ($ok ? 'anfrage-gesendet' : 'anfrage-fehler'), true, 303);
    }
    exit;
}

function feld(string $name, int $max): string
{
    $wert = isset($_POST[$name]) && is_string($_POST[$name]) ? $_POST[$name] : '';
    $wert = trim(str_replace("\0", '', $wert));
    if (function_exists('mb_substr')) {
        return mb_substr($wert, 0, $max, 'UTF-8');
    }
    return substr($wert, 0, $max);
}

function einzeilig(string $wert): string
{
    // Zeilenumbrüche entfernen, verhindert eingeschleuste Kopfzeilen
    return trim(preg_replace('/[\r\n\t]+/', ' ', $wert) ?? '');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    antwort(false, 'method', 405);
}

// Spamschutz: verstecktes Feld und Bearbeitungszeit
$honeypot = feld('website', 200);
$ts = (int) feld('ts', 20);
$jetzt = (int) round(microtime(true) * 1000);
$alter = ($jetzt - $ts) / 1000;
if ($honeypot !== '' || ($ts > 0 && $alter < MIN_SEKUNDEN)) {
    // Ausgefülltes Lockfeld oder unmenschlich schnell: für Bots unauffällig quittieren, nichts wird versendet
    antwort(true);
}
if ($ts > 0 && $alter > MAX_SEKUNDEN) {
    // Seite zu lange geöffnet: Nutzer soll es erneut versuchen (ohne JavaScript ist ts = 0)
    antwort(false, 'expired', 409);
}

$name = einzeilig(feld('name', 120));
$firma = einzeilig(feld('firma', 160));
$email = einzeilig(feld('email', 160));
$telefon = einzeilig(feld('telefon', 60));
$adresse = einzeilig(feld('adresse', 160));
$plzOrt = einzeilig(feld('plz_ort', 120));
$interesse = einzeilig(feld('interesse', 80));
$nachricht = feld('nachricht', 5000);
$datenschutz = feld('datenschutz', 5);

if (!in_array($interesse, INTERESSEN, true)) {
    $interesse = 'Sonstiges';
}

$gueltig = $name !== ''
    && filter_var($email, FILTER_VALIDATE_EMAIL) !== false
    && strlen($nachricht) >= 5
    && $datenschutz === 'ja';

if (!$gueltig) {
    antwort(false, 'validation', 422);
}

$text = "Neue Anfrage über das Kontaktformular der Website\n"
    . str_repeat('-', 52) . "\n"
    . "Interesse an: {$interesse}\n"
    . "Name:         {$name}\n"
    . "Firma:        {$firma}\n"
    . "E-Mail:       {$email}\n"
    . "Telefon:      {$telefon}\n"
    . "Adresse:      {$adresse}\n"
    . "PLZ und Ort:  {$plzOrt}\n"
    . str_repeat('-', 52) . "\n\n"
    . $nachricht . "\n\n"
    . str_repeat('-', 52) . "\n"
    . 'Gesendet am ' . date('d.m.Y \u\m H:i') . " Uhr. Einwilligung Datenschutz: ja\n";

$host = strtolower((string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
$test = !in_array($host, PRODUKTIV, true);

$betreff = ($test ? '[Test] ' : '') . 'Projektanfrage über ip3-energie.de: ' . $interesse;
if (function_exists('mb_encode_mimeheader')) {
    $betreff = mb_encode_mimeheader($betreff, 'UTF-8', 'B', "\r\n");
    $absenderName = mb_encode_mimeheader(ABSENDER_NAME, 'UTF-8', 'B', "\r\n");
} else {
    $absenderName = ABSENDER_NAME;
}

$kopf = [
    'From' => $absenderName . ' <' . ABSENDER . '>',
    'Reply-To' => $email,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
    'X-Mailer' => 'ip3-website',
];

$gesendet = @mail(EMPFAENGER, $betreff, $text, $kopf, '-f' . ABSENDER);
if (!$gesendet) {
    // manche Hoster erlauben den Parameter -f nicht
    $gesendet = @mail(EMPFAENGER, $betreff, $text, $kopf);
}

if (!$gesendet) {
    antwort(false, 'send', 502);
}

antwort(true);

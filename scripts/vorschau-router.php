<?php
// Lokale Vorschau mit sauberen URLs und funktionsfähigem Formular-Skript:
//   npm run build
//   php -S 127.0.0.1:8080 -t dist scripts/vorschau-router.php
// Ohne Mailserver schreibt PHP keine Mails. Zum Testen den Versand in eine Datei umleiten:
//   php -d sendmail_path="tee -a /tmp/ip3-mail.txt" -S 127.0.0.1:8080 -t dist scripts/vorschau-router.php

$root = $_SERVER['DOCUMENT_ROOT'];
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');

if ($uri !== '/' && substr($uri, -1) === '/') {
    header('Location: ' . rtrim($uri, '/'), true, 301);
    exit;
}
if ($uri === '/' || is_file($root . $uri)) {
    return false; // statische Datei bzw. PHP-Skript ausliefern
}
if (is_file($root . $uri . '.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($root . $uri . '.html');
    exit;
}
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
readfile($root . '/404.html');

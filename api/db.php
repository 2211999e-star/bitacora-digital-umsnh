<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $configPath = getenv('BITACORA_CONFIG') ?: '/etc/bitacora-digital/config.php';
    if (!is_file($configPath) || !is_readable($configPath)) {
        throw new RuntimeException('Falta el archivo de configuración protegido de la base de datos.');
    }
    $config = require $configPath;
    if (!is_array($config) || empty($config['host']) || empty($config['database']) || empty($config['username']) || !array_key_exists('password', $config)) {
        throw new RuntimeException('La configuración de base de datos está incompleta.');
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']);
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

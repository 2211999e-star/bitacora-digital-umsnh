<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';

function prompt(string $label): string
{
    fwrite(STDOUT, $label);
    $value = fgets(STDIN);
    return trim($value === false ? '' : $value);
}

function prompt_password(): string
{
    fwrite(STDOUT, 'Contraseña (mínimo 12 caracteres): ');
    $hidden = function_exists('shell_exec') && stripos(PHP_OS, 'WIN') !== 0;
    if ($hidden) {
        shell_exec('stty -echo');
    }
    try {
        $password = fgets(STDIN);
    } finally {
        if ($hidden) {
            shell_exec('stty echo');
            fwrite(STDOUT, PHP_EOL);
        }
    }
    return trim($password === false ? '' : $password);
}

try {
    $username = strtolower(prompt('Usuario inicial (ivan o kevin): '));
    $name = prompt('Nombre para mostrar: ');
    $role = prompt('Cargo/rol: ');
    $password = prompt_password();
    if (!in_array($username, ['ivan', 'kevin'], true) || $name === '' || strlen($password) < 12) {
        throw new InvalidArgumentException('Datos no válidos: usa ivan/kevin y una contraseña de al menos 12 caracteres.');
    }

    $query = db()->prepare(
        'INSERT INTO users (username, display_name, role, is_admin, password_hash) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), role = VALUES(role), is_admin = VALUES(is_admin), password_hash = VALUES(password_hash)',
    );
    $query->execute([$username, $name, $role, $username === 'ivan' ? 1 : 0, password_hash($password, PASSWORD_DEFAULT)]);
    fwrite(STDOUT, "Usuario guardado correctamente.\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'No se pudo crear el usuario: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}

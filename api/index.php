<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? '1' : '0');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function request_data(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw === false ? '' : $raw, true);
    if (!is_array($data)) {
        respond(400, ['error' => 'El cuerpo JSON no es válido.']);
    }
    return $data;
}

function require_same_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        respond(403, ['error' => 'Falta validar el origen de la solicitud.']);
    }
    $expected = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http')
        . '://' . ($_SERVER['HTTP_HOST'] ?? '');
    if (!hash_equals($expected, $origin)) {
        respond(403, ['error' => 'Origen de solicitud no permitido.']);
    }
}

function require_user(): array
{
    if (!isset($_SESSION['user']) || !is_array($_SESSION['user'])) {
        respond(401, ['error' => 'Inicia sesión para continuar.']);
    }
    return $_SESSION['user'];
}

function require_admin(PDO $pdo): array
{
    $user = require_user();
    $query = $pdo->prepare("SELECT is_admin FROM users WHERE id = ? AND username = 'ivan'");
    $query->execute([$_SESSION['database_user_id'] ?? 0]);
    if (($user['id'] ?? '') !== 'ivan' || (int) $query->fetchColumn() !== 1) {
        respond(403, ['error' => 'Solo Iván puede administrar las cuentas de usuario.']);
    }
    return $user;
}

function read_state(PDO $pdo): array
{
    $row = $pdo->query('SELECT revision, state_json FROM app_state WHERE id = 1')->fetch();
    if (!$row) {
        throw new RuntimeException('No existe el estado inicial. Importa api/schema.sql.');
    }
    $state = json_decode($row['state_json'], true);
    if (!is_array($state)) {
        throw new RuntimeException('El estado almacenado no es válido.');
    }
    return [
        'revision' => (int) $row['revision'],
        'records' => is_array($state['records'] ?? null) ? $state['records'] : [],
        'events' => is_array($state['events'] ?? null) ? $state['events'] : [],
        'profiles' => is_array($state['profiles'] ?? null) ? $state['profiles'] : (object) [],
    ];
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($action === 'health' && $method === 'GET') {
        db()->query('SELECT 1');
        respond(200, ['ok' => true]);
    }

    if ($action === 'login' && $method === 'POST') {
        require_same_origin();
        $input = request_data();
        $username = strtolower(trim((string) ($input['username'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        if ($username === '' || $password === '' || strlen($username) > 64 || strlen($password) > 1024) {
            respond(422, ['error' => 'Escribe usuario y contraseña.']);
        }

        $query = db()->prepare('SELECT id, username, display_name, role, is_admin, password_hash FROM users WHERE username = ?');
        $query->execute([$username]);
        $row = $query->fetch();
        if (!$row || !password_verify($password, $row['password_hash'])) {
            respond(401, ['error' => 'Usuario o contraseña incorrectos.']);
        }

        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id' => (string) $row['username'],
            'name' => $row['display_name'],
            'role' => $row['role'],
            'is_admin' => (bool) $row['is_admin'],
        ];
        $_SESSION['database_user_id'] = (int) $row['id'];
        respond(200, ['user' => $_SESSION['user'], 'state' => read_state(db())]);
    }

    if ($action === 'logout' && $method === 'POST') {
        require_same_origin();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
        }
        session_destroy();
        respond(200, ['ok' => true]);
    }

    if ($action === 'state' && $method === 'GET') {
        require_user();
        respond(200, ['state' => read_state(db())]);
    }

    if ($action === 'users' && $method === 'GET') {
        $pdo = db();
        require_admin($pdo);
        $users = $pdo->query('SELECT username, display_name, role FROM users ORDER BY display_name, username')->fetchAll();
        respond(200, ['users' => $users]);
    }

    if ($action === 'users' && $method === 'POST') {
        require_same_origin();
        $pdo = db();
        require_admin($pdo);
        $input = request_data();
        $username = strtolower(trim((string) ($input['username'] ?? '')));
        $name = trim((string) ($input['display_name'] ?? ''));
        $role = trim((string) ($input['role'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{2,31}$/', $username)
            || $name === '' || strlen($name) > 120 || strlen($role) > 160
            || strlen($password) < 12 || strlen($password) > 1024) {
            respond(422, ['error' => 'Revisa los datos: usuario de 3 a 32 caracteres, nombre obligatorio y contraseña de al menos 12 caracteres.']);
        }

        try {
            $create = $pdo->prepare(
                'INSERT INTO users (username, display_name, role, is_admin, password_hash) VALUES (?, ?, ?, 0, ?)',
            );
            $create->execute([$username, $name, $role, password_hash($password, PASSWORD_DEFAULT)]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                respond(409, ['error' => 'Ese nombre de usuario ya existe.']);
            }
            throw $error;
        }
        respond(201, ['message' => 'Usuario agregado a la base de datos.']);
    }

    if ($action === 'user-password' && $method === 'PUT') {
        require_same_origin();
        $pdo = db();
        require_admin($pdo);
        $input = request_data();
        $username = strtolower(trim((string) ($input['username'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{2,31}$/', $username)
            || strlen($password) < 12 || strlen($password) > 1024) {
            respond(422, ['error' => 'Elige una cuenta y escribe una contraseña de al menos 12 caracteres.']);
        }
        $update = $pdo->prepare('UPDATE users SET password_hash = ? WHERE username = ?');
        $update->execute([password_hash($password, PASSWORD_DEFAULT), $username]);
        if ($update->rowCount() !== 1) {
            respond(404, ['error' => 'No se encontró la cuenta o la contraseña no cambió.']);
        }
        respond(200, ['message' => 'Contraseña actualizada en la base de datos.']);
    }

    if ($action === 'state' && $method === 'PUT') {
        require_same_origin();
        require_user();
        $input = request_data();
        $revision = filter_var($input['revision'] ?? null, FILTER_VALIDATE_INT);
        $records = $input['records'] ?? null;
        $events = $input['events'] ?? null;
        $profiles = $input['profiles'] ?? null;
        if ($revision === false || $revision < 0 || !is_array($records) || !is_array($events) || !is_array($profiles)) {
            respond(422, ['error' => 'El estado enviado tiene un formato no válido.']);
        }
        if (count($records) > 10000 || count($events) > 10000 || strlen((string) json_encode($input)) > 8 * 1024 * 1024) {
            respond(413, ['error' => 'El estado supera el límite permitido.']);
        }
        foreach (array_merge($records, $events) as $item) {
            if (!is_array($item) || !is_string($item['id'] ?? null)) {
                respond(422, ['error' => 'Hay actividades o eventos con formato no válido.']);
            }
        }
        foreach ($profiles as $profile) {
            if (!is_array($profile)) {
                respond(422, ['error' => 'Hay perfiles con formato no válido.']);
            }
        }

        $pdo = db();
        $pdo->beginTransaction();
        $current = $pdo->query('SELECT revision FROM app_state WHERE id = 1 FOR UPDATE')->fetch();
        if (!$current) {
            $pdo->rollBack();
            throw new RuntimeException('No existe el estado inicial. Importa api/schema.sql.');
        }
        if ((int) $current['revision'] !== $revision) {
            $pdo->rollBack();
            respond(409, ['error' => 'Otra sesión modificó los datos. Descarga un respaldo local antes de recargar para evitar perder tus cambios.']);
        }

        $nextState = json_encode(
            ['records' => array_values($records), 'events' => array_values($events), 'profiles' => $profiles],
            JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE,
        );
        if ($nextState === false) {
            $pdo->rollBack();
            respond(422, ['error' => 'No se pudieron codificar los datos enviados.']);
        }
        $update = $pdo->prepare('UPDATE app_state SET revision = revision + 1, state_json = ?, updated_by = ? WHERE id = 1');
        $update->execute([$nextState, $_SESSION['database_user_id'] ?? null]);
        $pdo->commit();
        respond(200, ['revision' => $revision + 1]);
    }

    respond(404, ['error' => 'Acción de API no encontrada.']);
} catch (Throwable $error) {
    error_log('[bitacora-api] ' . $error->getMessage());
    respond(500, ['error' => 'Error interno del servidor. Revisa el registro de Apache/PHP.']);
}

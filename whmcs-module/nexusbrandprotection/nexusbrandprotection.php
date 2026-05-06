<?php
/**
 * Nexus Brand Protection WHMCS Server Module
 * Install as:
 * /srv/segbytes/whmcs/modules/servers/nexusbrandprotection/nexusbrandprotection.php
 */

if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

const NBP_ALLOWED_API_BASE = 'https://api.brandprotection.segbytes.co.za/api';
const NBP_CLIENT_APP_URL = 'https://brandprotection.segbytes.co.za';

function nexusbrandprotection_MetaData()
{
    return [
        'DisplayName' => 'Nexus Brand Protection',
        'APIVersion' => '1.1',
        'RequiresServer' => false,
    ];
}

function nexusbrandprotection_ConfigOptions()
{
    return [
        'API Base URL' => [
            'Type' => 'text',
            'Size' => '64',
            'Default' => NBP_ALLOWED_API_BASE,
            'Description' => 'Must be exactly ' . NBP_ALLOWED_API_BASE,
        ],
        'API Token' => [
            'Type' => 'password',
            'Size' => '64',
            'Description' => 'Must match WHMCS_API_TOKEN on the Nexus Brand Protection VM',
        ],
        'Default Plan' => [
            'Type' => 'text',
            'Size' => '24',
            'Default' => 'starter',
        ],
    ];
}

function nexusbrandprotection_safe_error()
{
    return 'Nexus Brand Protection action failed. Check the WHMCS module log for details.';
}

function nexusbrandprotection_api($params, $path, array $payload = [])
{
    $base = rtrim($params['configoption1'] ?: NBP_ALLOWED_API_BASE, '/');
    $token = $params['configoption2'];

    if ($base !== NBP_ALLOWED_API_BASE) {
        throw new Exception('Invalid Nexus Brand Protection API base URL configuration');
    }
    if (!$token) {
        throw new Exception('Nexus Brand Protection API token is not configured');
    }

    $url = $base . $path;
    $encodedPayload = json_encode($payload);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $encodedPayload,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $body = curl_exec($ch);
    $err = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = is_string($body) ? json_decode($body, true) : null;

    if ($body === false || $err || $code < 200 || $code >= 300 || !is_array($json) || empty($json['success'])) {
        if (function_exists('logModuleCall')) {
            logModuleCall('nexusbrandprotection', $path, $payload, [
                'http_code' => $code,
                'curl_error' => $err,
                'response' => $body,
            ], null, [$token]);
        }
        throw new Exception(nexusbrandprotection_safe_error());
    }

    if (function_exists('logModuleCall')) {
        logModuleCall('nexusbrandprotection', $path, $payload, ['http_code' => $code, 'success' => true], null, [$token]);
    }

    return $json;
}

function nexusbrandprotection_payload($params)
{
    return [
        'clientId' => (string) $params['clientsdetails']['userid'],
        'serviceId' => (string) $params['serviceid'],
        'companyName' => $params['clientsdetails']['companyname'] ?: trim(($params['clientsdetails']['firstname'] ?? '') . ' ' . ($params['clientsdetails']['lastname'] ?? '')),
        'adminEmail' => $params['clientsdetails']['email'],
        'adminName' => trim(($params['clientsdetails']['firstname'] ?? '') . ' ' . ($params['clientsdetails']['lastname'] ?? '')),
        'plan' => $params['configoption3'] ?: 'starter',
    ];
}

function nexusbrandprotection_CreateAccount($params)
{
    try {
        nexusbrandprotection_api($params, '/whmcs/provision', nexusbrandprotection_payload($params));
        return 'success';
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function nexusbrandprotection_SuspendAccount($params)
{
    try {
        nexusbrandprotection_api($params, '/whmcs/suspend', [
            'clientId' => (string) $params['clientsdetails']['userid'],
            'serviceId' => (string) $params['serviceid'],
        ]);
        return 'success';
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function nexusbrandprotection_UnsuspendAccount($params)
{
    try {
        nexusbrandprotection_api($params, '/whmcs/unsuspend', [
            'clientId' => (string) $params['clientsdetails']['userid'],
            'serviceId' => (string) $params['serviceid'],
        ]);
        return 'success';
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function nexusbrandprotection_TerminateAccount($params)
{
    try {
        nexusbrandprotection_api($params, '/whmcs/terminate', [
            'clientId' => (string) $params['clientsdetails']['userid'],
            'serviceId' => (string) $params['serviceid'],
        ]);
        return 'success';
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function nexusbrandprotection_ClientArea($params)
{
    try {
        $payload = nexusbrandprotection_payload($params);
        $payload['email'] = $params['clientsdetails']['email'];
        $payload['name'] = $payload['adminName'];
        $payload['role'] = 'owner';
        $login = nexusbrandprotection_api($params, '/whmcs/login-token', $payload);
        $token = urlencode($login['token']);
        $url = NBP_CLIENT_APP_URL . '?token=' . $token;

        return [
            'templatefile' => 'templates/clientarea',
            'vars' => [
                'nexus_brand_protection_url' => $url,
            ],
        ];
    } catch (Exception $e) {
        return [
            'templatefile' => 'templates/clientarea',
            'vars' => [
                'nexus_brand_protection_error' => nexusbrandprotection_safe_error(),
            ],
        ];
    }
}

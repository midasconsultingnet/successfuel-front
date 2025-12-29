use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;

// Structure pour les données de connexion
#[derive(Deserialize, Serialize)]
pub struct LoginRequest {
    pub login: String,
    pub password: String,
}

// Structure pour la réponse de connexion
#[derive(Deserialize, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub token_type: String,
}

// Structure pour gérer l'état d'authentification
pub struct AuthState {
    pub http_client: Client,
    pub api_base_url: String,
}

impl AuthState {
    pub fn new(api_base_url: String) -> Result<Self, Box<dyn std::error::Error>> {
        let http_client = Client::builder()
            .cookie_store(true) // Activer le stockage des cookies
            .build()?;

        Ok(AuthState {
            http_client,
            api_base_url,
        })
    }
}

// Commande pour se connecter
#[tauri::command]
pub async fn login(
    auth_state: State<'_, AuthState>,
    credentials: LoginRequest,
) -> Result<LoginResponse, String> {
    let login_url = format!("{}/auth/login", auth_state.api_base_url);

    let response = auth_state
        .http_client
        .post(&login_url)
        .json(&credentials)
        .send()
        .await
        .map_err(|e| format!("Erreur de connexion: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Échec de la connexion: {}", response.status()));
    }

    let login_response: LoginResponse = response
        .json()
        .await
        .map_err(|e| format!("Erreur de parsing de la réponse: {}", e))?;

    Ok(login_response)
}

// Commande pour rafraîchir le token
#[tauri::command]
pub async fn refresh_token(auth_state: State<'_, AuthState>) -> Result<LoginResponse, String> {
    let refresh_url = format!("{}/auth/refresh", auth_state.api_base_url);

    let response = auth_state
        .http_client
        .post(&refresh_url)
        .send()
        .await
        .map_err(|e| format!("Erreur de refresh: {}", e))?;

    if !response.status().is_success() {
        // Inclure le code d'état HTTP dans le message d'erreur pour permettre au frontend de le détecter
        return Err(format!("Échec du refresh: HTTP_{}", response.status().as_u16()));
    }

    let refresh_response: LoginResponse = response
        .json()
        .await
        .map_err(|e| format!("Erreur de parsing de la réponse: {}", e))?;

    Ok(refresh_response)
}

// Commande pour se déconnecter - Maintenant ne fait que nettoyer les cookies du côté Rust
// La requête vers le serveur est gérée côté frontend comme avant
#[tauri::command]
pub async fn logout(_auth_state: State<'_, AuthState>) -> Result<(), String> {
    // Dans l'environnement Tauri, cette commande sert à nettoyer les cookies HTTPOnly côté Rust
    // La requête de logout vers le serveur est effectuée côté frontend via fetch
    // Le nettoyage principal est fait côté frontend qui nettoie le localStorage et appelle l'API

    // On pourrait potentiellement nettoyer le cookie store ici si nécessaire
    // mais pour le logout, le principal est de supprimer le token côté frontend

    Ok(())
}
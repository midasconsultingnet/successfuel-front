use std::sync::Mutex;
use tauri::async_runtime::spawn;
use tauri::{AppHandle, Manager, State, PhysicalPosition};
use tokio::time::{sleep, Duration};

mod auth;

// Structure pour suivre l'état d'initialisation
struct SetupState {
    frontend_task: bool,
    backend_task: bool,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Commande pour signaler la complétion d'une tâche
#[tauri::command]
async fn set_complete(
    app: AppHandle,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), ()> {
    sleep(Duration::from_secs(10)).await;
    let mut state_lock = state.lock().map_err(|_| ())?;

    match task.as_str() {
        "frontend" => {
            println!("Tâche frontend marquée comme terminée");
            state_lock.frontend_task = true;
        },
        "backend" => {
            println!("Tâche backend marquée comme terminée");
            state_lock.backend_task = true;
        },
        _ => panic!("Tâche invalide complétée!"),
    }

    println!("État actuel - frontend: {}, backend: {}", state_lock.frontend_task, state_lock.backend_task);

    // Si les deux tâches sont terminées, fermer le splashscreen et montrer la fenêtre principale
    if state_lock.backend_task && state_lock.frontend_task {
        println!("Les deux tâches sont terminées, fermeture du splashscreen...");
        if let Some(splash_window) = app.get_webview_window("splashscreen") {
            let _ = splash_window.close();
        }
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.show();
        }
        println!("Splashscreen fermé, fenêtre principale affichée");
    } else {
        println!("Au moins une tâche n'est pas encore terminée");
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .manage(auth::AuthState::new(
            std::env::var("VITE_API_BASE_URL")
                .unwrap_or_else(|_| "https://successfuel-api.onrender.com/api/v1".to_string())
        ).expect("Impossible de créer l'état d'authentification"))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            set_complete,
            auth::login,
            auth::refresh_token,
            auth::logout
        ])
        .setup(|app| {
            spawn(setup(app.handle().clone()));
            let window_splashscreen = app.get_webview_window("splashscreen").unwrap();
            let window_main = app.get_webview_window("main").unwrap();
            let primary_monitor = app.primary_monitor().unwrap().unwrap();
            let monitor_size = primary_monitor.size();
            let window_splashscreen_size = window_splashscreen.inner_size().unwrap();
            let window_main_size = window_main.inner_size().unwrap();

            let x_splash = (monitor_size.width as i32 - window_splashscreen_size.width as i32) / 2;
            let y_splash = (monitor_size.height as i32 - window_splashscreen_size.height as i32) / 2;
            let x_main = (monitor_size.width as i32 - window_main_size.width as i32) / 2;
            let y_main = (monitor_size.height as i32 - window_main_size.height as i32) / 2;

            window_splashscreen.set_position(PhysicalPosition::new(x_splash, y_splash)).unwrap();
            window_main.set_position(PhysicalPosition::new(x_main, y_main)).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Fonction d'initialisation backend
async fn setup(app: AppHandle) -> Result<(), ()> {
    println!("Tâche d'initialisation backend en cours...");
    sleep(Duration::from_secs(1)).await; // Attendre 1 seconde pour simuler une tâche
    println!("Tâche d'initialisation backend terminée!");

    // Notification que la tâche backend est terminée
    {
        let state = app.state::<Mutex<SetupState>>();
        if let Ok(mut state_lock) = state.lock() {
            state_lock.backend_task = true;
        };
    }

    // Vérifier si les deux tâches sont terminées
    {
        let state = app.state::<Mutex<SetupState>>();
        if let Ok(state_lock) = state.lock() {
            if state_lock.backend_task && state_lock.frontend_task {
                drop(state_lock); // Libérer explicitement le verrou avant d'interagir avec les fenêtres
                if let Some(splash_window) = app.get_webview_window("splashscreen") {
                    let _ = splash_window.close();
                }
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                }
                println!("Splashscreen fermé via la fonction setup, fenêtre principale affichée");
            }
        };
    }

    Ok(())
}

use tauri::Manager;

#[tauri::command]
fn app_info() -> String {
    "종합여행사 ERP 셸 v0.1".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .setup(|app| {
            let win = app.get_webview_window("main").expect("main window");
            #[cfg(any(windows, target_os = "linux"))]
            let _ = win;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("tauri app 실행 실패");
}

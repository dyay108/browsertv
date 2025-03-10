migrate((app) => {
    let users = app.findCollectionByNameOrId("_pb_users_auth_")

    let record = new Record(users)
    const USER_EMAIL = $os.getenv("USER_EMAIL")
    const USER_PASSWORD = $os.getenv("USER_PASSWORD")

    record.set("email", USER_EMAIL)
    record.set("password", USER_PASSWORD)

    app.save(record)
}, (app) => { // optional revert operation
    try {
        let record = app.findAuthRecordByEmail("_superusers", "test@example.com")
        app.delete(record)
    } catch {
        // silent errors (probably already deleted)
    }
})
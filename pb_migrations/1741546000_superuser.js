migrate((app) => {
    let superusers = app.findCollectionByNameOrId("_superusers")

    let record = new Record(superusers)
    const ADMIN_EMAIL = $os.getenv("ADMIN_EMAIL")
    const ADMIN_PASSWORD = $os.getenv("ADMIN_PASSWORD")

    record.set("email", ADMIN_EMAIL)
    record.set("password", ADMIN_PASSWORD)

    app.save(record)
}, (app) => { // optional revert operation
    try {
        let record = app.findAuthRecordByEmail("_superusers", "test@example.com")
        app.delete(record)
    } catch {
        // silent errors (probably already deleted)
    }
})
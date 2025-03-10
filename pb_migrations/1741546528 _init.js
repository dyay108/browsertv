migrate((app) => {

  // Create playlists collection
  const playlistsCollection = new Collection({
    name: "playlists",
    type: "base",
    listRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    viewRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    createRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    updateRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    deleteRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
      },
      {
        name: "lastUsed",
        type: "date",
        required: true,
      },
      {
        name: "url",
        type: "text",
        required: false,
      },
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
    ],
  });

  // Create channels collection
  const channelsCollection = new Collection({
    name: "channels",
    type: "base",
    listRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    viewRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    createRule: `@request.auth.id != "" && playlist =  @request.body.playlist && playlist.user.id = @request.auth.id`,
    updateRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    deleteRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
      },
      {
        name: "url",
        type: "text",
        required: true,
      },
      {
        name: "logo",
        type: "text",
        required: false,
        max: 10000,
      },
      {
        name: "group",
        type: "text",
        required: true,
      },
      {
        name: "tvgId",
        type: "text",
        required: false,
      },
      {
        name: "tvgName",
        type: "text",
        required: false,
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        collectionId: playlistsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
    ],
  });

  // Create groups collection
  const groupsCollection = new Collection({
    name: "groups",
    type: "base",
    listRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    viewRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    createRule: `@request.auth.id != "" && playlist = @request.body.playlist && playlist.user.id = @request.auth.id`,
    updateRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    deleteRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        collectionId: playlistsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
    ],
  });

  // Create channel_groups collection
  const channelGroupsCollection = new Collection({
    name: "channel_groups",
    type: "base",
    listRule: `@request.auth.id != "" && (channel.playlist.user.id = @request.auth.id || group.playlist.user.id = @request.auth.id)`,
    viewRule: `@request.auth.id != "" && (channel.playlist.user.id = @request.auth.id || group.playlist.user.id = @request.auth.id)`,
    createRule: `@request.auth.id != "" && group =  @request.body.group && group.playlist.user.id = @request.auth.id`,
    updateRule: `@request.auth.id != "" && channel.playlist.user.id = @request.auth.id && group.playlist.user.id = @request.auth.id`,
    deleteRule: `@request.auth.id != "" && channel.playlist.user.id = @request.auth.id && group.playlist.user.id = @request.auth.id`,
    fields: [
      {
        name: "channel",
        type: "relation",
        required: true,
        collectionId: channelsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "group",
        type: "relation",
        required: true,
        collectionId: groupsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
    ],
  });

  // Create favorites collection
  const favoritesCollection = new Collection({
    name: "favorites",
    type: "base",
    listRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    viewRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    createRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    updateRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    deleteRule: `@request.auth.id != "" && user.id = @request.auth.id`,
    fields: [
      {
        name: "channel",
        type: "relation",
        required: true,
        collectionId: channelsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        collectionId: playlistsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: true,
        maxSelect: 1,
      },
    ],
  });

  // Create group_order collection
  const groupOrderCollection = new Collection({
    name: "group_order",
    type: "base",
    listRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    viewRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    createRule: `@request.auth.id != "" && playlist =  @request.body.playlist && playlist.user.id = @request.auth.id`,
    updateRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    deleteRule: `@request.auth.id != "" && playlist.user.id = @request.auth.id`,
    fields: [
      {
        name: "groups",
        type: "json",
        required: true,
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        collectionId: playlistsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
    ],
  });

  // Save all collections
  app.save(playlistsCollection);
  app.save(channelsCollection);
  app.save(groupsCollection);
  app.save(channelGroupsCollection);
  app.save(favoritesCollection);
  app.save(groupOrderCollection);
}, (app) => {
  // Revert all collection changes
  app.delete(app.findCollectionByNameOrId("playlists"));
  app.delete(app.findCollectionByNameOrId("channels"));
  app.delete(app.findCollectionByNameOrId("groups"));
  app.delete(app.findCollectionByNameOrId("channel_groups"));
  app.delete(app.findCollectionByNameOrId("favorites"));
  app.delete(app.findCollectionByNameOrId("group_order"));
});
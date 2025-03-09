const PocketBase = require('pocketbase/cjs');

// PocketBase URL
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// Admin credentials from environment variables
const adminEmail = process.env.ADMIN_EMAIL || 'dd@dd.com';
const adminPassword = process.env.ADMIN_PASSWORD || '1234567890';

// Initialize PocketBase client
const pb = new PocketBase(PB_URL);

// Collection definitions with access rules
const collections = [
  {
    name: "playlists",
    schema: [
      {
        name: "name",
        type: "text",
        required: true
      },
      {
        name: "lastUsed",
        type: "date",
        required: true
      },
      {
        name: "url", 
        type: "text",
        required: false
      },
      {
        name: "user",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false
        }
      }
    ],
    // Access rules
    listRule: "@request.auth.id != \"\" && user.id = @request.auth.id",
    viewRule: "@request.auth.id != \"\" && user.id = @request.auth.id",
    createRule: "@request.auth.id != \"\"",
    updateRule: "@request.auth.id != \"\" && user.id = @request.auth.id",
    deleteRule: "@request.auth.id != \"\" && user.id = @request.auth.id"
  },
  {
    name: "channels",
    schema: [
      {
        name: "name",
        type: "text",
        required: true
      },
      {
        name: "url",
        type: "text", 
        required: true
      },
      {
        name: "logo",
        type: "text",
        required: false
      },
      {
        name: "group",
        type: "text",
        required: false
      },
      {
        name: "tvgId",
        type: "text",
        required: false
      },
      {
        name: "tvgName",
        type: "text",
        required: false
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        options: {
          collectionId: "playlists",
          cascadeDelete: true
        }
      }
    ],
    // Access rules
    listRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    viewRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    createRule: "@request.auth.id != \"\" && @request.data.playlist:exists && @collection.playlists.getOne(@request.data.playlist).user.id = @request.auth.id",
    updateRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    deleteRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id"
  },
  {
    name: "groups",
    schema: [
      {
        name: "name",
        type: "text",
        required: true
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        options: {
          collectionId: "playlists",
          cascadeDelete: true
        }
      }
    ],
    // Access rules
    listRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    viewRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    createRule: "@request.auth.id != \"\" && @request.data.playlist:exists && @collection.playlists.getOne(@request.data.playlist).user.id = @request.auth.id",
    updateRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    deleteRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id"
  },
  {
    name: "channel_groups",
    schema: [
      {
        name: "channel",
        type: "relation",
        required: true,
        options: {
          collectionId: "channels",
          cascadeDelete: true
        }
      },
      {
        name: "group",
        type: "relation",
        required: true,
        options: {
          collectionId: "groups",
          cascadeDelete: true
        }
      }
    ],
    // Access rules
    listRule: "@request.auth.id != \"\" && (channel.playlist.user.id = @request.auth.id || group.playlist.user.id = @request.auth.id)",
    viewRule: "@request.auth.id != \"\" && (channel.playlist.user.id = @request.auth.id || group.playlist.user.id = @request.auth.id)",
    createRule: "@request.auth.id != \"\" && @request.data.channel:exists && @request.data.group:exists && @collection.channels.getOne(@request.data.channel).playlist.user.id = @request.auth.id && @collection.groups.getOne(@request.data.group).playlist.user.id = @request.auth.id",
    updateRule: "@request.auth.id != \"\" && channel.playlist.user.id = @request.auth.id && group.playlist.user.id = @request.auth.id",
    deleteRule: "@request.auth.id != \"\" && channel.playlist.user.id = @request.auth.id && group.playlist.user.id = @request.auth.id"
  },
  {
    name: "favorites",
    schema: [
      {
        name: "channel",
        type: "relation",
        required: true,
        options: {
          collectionId: "channels",
          cascadeDelete: true
        }
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        options: {
          collectionId: "playlists",
          cascadeDelete: true
        }
      },
      {
        name: "user",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: true
        }
      }
    ],
    // Access rules
    listRule: "@request.auth.id != \"\" && user.id = @request.auth.id",
    viewRule: "@request.auth.id != \"\" && user.id = @request.auth.id",
    createRule: "@request.auth.id != \"\" && @request.data.user = @request.auth.id",
    updateRule: "@request.auth.id != \"\" && user.id = @request.auth.id",
    deleteRule: "@request.auth.id != \"\" && user.id = @request.auth.id"
  },
  {
    name: "group_order",
    schema: [
      {
        name: "groups",
        type: "json",
        required: true
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        options: {
          collectionId: "playlists",
          cascadeDelete: true
        }
      }
    ],
    // Access rules
    listRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    viewRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    createRule: "@request.auth.id != \"\" && @request.data.playlist:exists && @collection.playlists.getOne(@request.data.playlist).user.id = @request.auth.id",
    updateRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id",
    deleteRule: "@request.auth.id != \"\" && playlist.user.id = @request.auth.id"
  }
];

// Main setup function
async function setupPocketBase() {
  try {
    console.log("Starting PocketBase setup...");
    console.log(`Using PocketBase URL: ${PB_URL}`);
    
    // Authenticate as admin
    console.log("Authenticating as admin...");
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log("Successfully authenticated as admin");
    } catch (error) {
      console.error("Authentication error:", error);
      throw new Error("Failed to authenticate. Please check your credentials.");
    }
    
    // Check existing collections to avoid duplicates
    console.log("Checking existing collections...");
    const existingCollections = await pb.collections.getFullList();
    const existingNames = existingCollections.map(c => c.name);
    
    // Create collections
    console.log("Creating collections...");
    
    for (const collection of collections) {
      if (existingNames.includes(collection.name)) {
        console.log(`Collection "${collection.name}" already exists, updating rules...`);
        
        // Get the existing collection
        const existingCollection = existingCollections.find(c => c.name === collection.name);
        
        // Update the collection with new rules
        try {
          await pb.collections.update(existingCollection.id, {
            listRule: collection.listRule,
            viewRule: collection.viewRule,
            createRule: collection.createRule,
            updateRule: collection.updateRule,
            deleteRule: collection.deleteRule
          });
          
          console.log(`Collection "${collection.name}" rules updated successfully.`);
        } catch (error) {
          console.error(`Error updating collection "${collection.name}" rules:`, error);
        }
        
        continue;
      }
      
      console.log(`Creating collection "${collection.name}"...`);
      
      try {
        // Extract schema and rules
        const { schema, name, listRule, viewRule, createRule, updateRule, deleteRule } = collection;
        
        await pb.collections.create({
          name,
          type: "base",
          schema,
          listRule,
          viewRule,
          createRule,
          updateRule,
          deleteRule
        });
        
        console.log(`Collection "${collection.name}" created successfully.`);
      } catch (error) {
        console.error(`Error creating collection "${collection.name}":`, error);
      }
    }
    
    console.log("Setup completed successfully!");
  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  }
}

// Wait 5 seconds and then run the setup
setTimeout(() => {
  setupPocketBase();
}, 5000);
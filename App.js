import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SQLite from "expo-sqlite"; // Ensure this library supports `openDatabaseAsync`
import * as Location from "expo-location";

let db; // Declare the database instance globally

const initializeDatabase = async () => {
  try {
    // Open or create the database asynchronously
    db = await SQLite.openDatabaseAsync("images.db");

    // Create the images table if it doesn't already exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uri TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        latitude REAL,
        longitude REAL
      );
    `);

    console.log("Database initialized and table created (if not exists).");
  } catch (error) {
    console.error("Error initializing the database:", error);
  }
};

const fetchImagesFromDatabase = async (setImages) => {
  try {
    const rows = await db.getAllAsync("SELECT * FROM images");
    const fetchedImages = rows.map((row) => row.uri); // Extract image URIs
    setImages(fetchedImages); // Update the state with images
  } catch (error) {
    console.error("Error fetching images from database:", error);
  }
};

const addImageToDatabase = async (uri) => {
  const timestamp = new Date().toISOString(); // Current timestamp
  let latitude = null;
  let longitude = null;

  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const location = await Location.getCurrentPositionAsync({});
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
    } else {
      console.warn(
        "Location permission not granted. Saving without location data."
      );
    }

    // Insert image data into the database
    await db.runAsync(
      "INSERT INTO images (uri, timestamp, latitude, longitude) VALUES (?, ?, ?, ?)",
      [uri, timestamp, latitude, longitude]
    );

    console.log(
      `Image added to database:timestamp: ${timestamp}, URI: ${uri}, Latitude: ${latitude}, Longitude: ${longitude}`
    );
  } catch (error) {
    console.error("Error inserting image metadata:", error);
  }
};

const logImagesFromDatabase = async () => {
  try {
    const rows = await db.getAllAsync("SELECT * FROM images");
    console.log("Image data from database:", rows);
  } catch (error) {
    console.error("Error fetching images from database:", error);
  }
};

export default function GalleryApp() {
  const [images, setImages] = useState([]); // Array to store image URIs

  useEffect(() => {
    const setupDatabase = async () => {
      await initializeDatabase(); // Initialize database
      await fetchImagesFromDatabase(setImages); // Fetch initial images
    };

    setupDatabase();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access gallery is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImages((prevImages) => [...prevImages, uri]); // Add to state
      await addImageToDatabase(uri, null, null); // Store in the database
      await logImagesFromDatabase();
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access camera is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImages((prevImages) => [...prevImages, uri]); // Add to state
      await addImageToDatabase(uri, null, null); // Store in the database
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Gallery</Text>

      {/* Buttons for picking and capturing images */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Gallery View */}
      <FlatList
        data={images}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3} // Display in 3 columns
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.image} />
        )}
        contentContainerStyle={styles.gallery}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  button: {
    flex: 1,
    backgroundColor: "#6200ee",
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  gallery: {
    justifyContent: "center",
  },
  image: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 10,
  },
});

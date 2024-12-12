import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SQLite from "expo-sqlite";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";

let db;

const initializeDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync("images.db");
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

const fetchImagesFromDatabase = async (setImages, setMarkers) => {
  try {
    const rows = await db.getAllAsync("SELECT * FROM images");
    const fetchedImages = rows.map((row) => ({
      id: row.id,
      uri: row.uri,
      latitude: row.latitude,
      longitude: row.longitude,
    }));
    setImages(fetchedImages);
    setMarkers(fetchedImages.filter((img) => img.latitude && img.longitude));
  } catch (error) {
    console.error("Error fetching images from database:", error);
  }
};

const addImageToDatabase = async (uri) => {
  const timestamp = new Date().toISOString();
  let latitude = null;
  let longitude = null;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const location = await Location.getCurrentPositionAsync({});
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
    }
    await db.runAsync(
      "INSERT INTO images (uri, timestamp, latitude, longitude) VALUES (?, ?, ?, ?)",
      [uri, timestamp, latitude, longitude]
    );
    console.log(`Image added: ${uri}, Lat: ${latitude}, Long: ${longitude}`);
  } catch (error) {
    console.error("Error inserting image metadata:", error);
  }
};

export default function GalleryApp() {
  const [images, setImages] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const setupDatabase = async () => {
      await initializeDatabase();
      await fetchImagesFromDatabase(setImages, setMarkers);
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
      setImages((prevImages) => [...prevImages, { uri }]);
      await addImageToDatabase(uri);
      await fetchImagesFromDatabase(setImages, setMarkers);
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
      setImages((prevImages) => [...prevImages, { uri }]);
      await addImageToDatabase(uri);
      await fetchImagesFromDatabase(setImages, setMarkers);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Gallery</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowMap(!showMap)}
        >
          <Text style={styles.buttonText}>
            {showMap ? "Show Gallery" : "Show Map"}
          </Text>
        </TouchableOpacity>
      </View>

      {showMap ? (
        <MapView style={styles.map}>
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              title="Image Location"
              description={`Photo id: ${marker.uri}`}
            />
          ))}
        </MapView>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item, index) => index.toString()}
          numColumns={3}
          renderItem={({ item }) => (
            <Image source={{ uri: item.uri }} style={styles.image} />
          )}
          contentContainerStyle={styles.gallery}
        />
      )}
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
  map: {
    flex: 1,
    marginTop: 10,
  },
});

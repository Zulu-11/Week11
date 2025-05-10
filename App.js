import React, { useState, useRef } from 'react';
import { StyleSheet, View, Button, Alert, Platform, Text } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { db, storage } from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function App() {
  const [hasCamPermission] = Camera.useCameraPermissions();
  const [hasLocPermission] = Location.useForegroundPermissions();
  const cameraRef = useRef(null);

  const takeAndUpload = async () => {
    if (!hasCamPermission?.granted || !hasLocPermission?.granted) {
      Alert.alert('Permissions not granted');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync();  

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });  

      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('Blob conversion failed'));
        xhr.responseType = 'blob';
        xhr.open('GET', photo.uri, true);
        xhr.send(null);
      });  

      const filename = photo.uri.split('/').pop();
      const storageRef = ref(storage, `photos/${filename}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);  

      const docRef = await addDoc(collection(db, 'photos'), {
        photoURL: downloadURL,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date().toISOString()
      });  

      Alert.alert('Success', `Saved with ID: ${docRef.id}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Upload failed', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} ref={cameraRef} />
      <Button title="Capture + Upload" onPress={takeAndUpload} />
      <Text style={styles.info}>
        Platform: {Platform.OS.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 4 },
  info: {
    textAlign: 'center',
    margin: 8
  }
});

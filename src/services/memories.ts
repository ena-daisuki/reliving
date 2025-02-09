import { storage, db } from "@/lib/firebase";
import { Memory } from "@/types/database";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export async function uploadMemory(
  file: File,
  userId: string,
  caption?: string
) {
  // Generate unique filename
  const filename = `memories/${userId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, filename);

  // Upload to Firebase Storage
  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);

  // Save metadata to Firestore
  const memoryData: Omit<Memory, "id"> = {
    userId,
    imageUrl,
    caption,
    filename,
    createdAt: serverTimestamp() as unknown as Date,
  };

  const docRef = await addDoc(collection(db, "memories"), memoryData);
  return docRef.id;
}

export async function getMemories(userId?: string) {
  let q = query(collection(db, "memories"), orderBy("createdAt", "desc"));

  if (userId) {
    q = query(
      collection(db, "memories"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Memory[];
}

export async function deleteMemory(memoryId: string, filename: string) {
  // Delete from Storage
  const storageRef = ref(storage, filename);
  await deleteObject(storageRef);

  // Delete from Firestore
  await deleteDoc(doc(db, "memories", memoryId));
}

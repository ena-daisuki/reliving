import { storage, db } from "@/lib/firebase";
import { Vlog } from "@/types/database";
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

export async function uploadVlog(file: File, userId: string, title: string) {
  // Generate unique filename
  const filename = `vlogs/${userId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, filename);

  // Upload to Firebase Storage
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // Save metadata to Firestore
  const vlogData: Omit<Vlog, "id"> = {
    userId,
    title,
    url,
    filename,
    createdAt: serverTimestamp() as unknown as Date,
  };

  const docRef = await addDoc(collection(db, "vlogs"), vlogData);
  return docRef.id;
}

export async function getVlogs(userId?: string) {
  let q = query(collection(db, "vlogs"), orderBy("createdAt", "desc"));

  if (userId) {
    q = query(
      collection(db, "vlogs"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Vlog[];
}

export async function deleteVlog(vlogId: string, filename: string) {
  // Delete from Storage
  const storageRef = ref(storage, filename);
  await deleteObject(storageRef);

  // Delete from Firestore
  await deleteDoc(doc(db, "vlogs", vlogId));
}

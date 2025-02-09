import { storage, db } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";

export async function uploadVlog(file: File, userId: string) {
  // Generate unique filename
  const filename = `vlogs/${userId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, filename);

  // Upload to Firebase Storage
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // Save metadata to Firestore
  await addDoc(collection(db, "vlogs"), {
    userId,
    url,
    createdAt: new Date(),
    filename,
  });

  return url;
}

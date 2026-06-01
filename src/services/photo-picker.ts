import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { actionSheetController } from '@ionic/vue';

/**
 * Ouvre un action sheet pour choisir entre caméra et galerie,
 * puis retourne un objet { file, previewUrl } ou null si annulé.
 */
export async function pickPhoto(): Promise<{ file: File; previewUrl: string } | null> {
  const actionSheet = await actionSheetController.create({
    header: 'Choisir une photo',
    buttons: [
      { text: 'Prendre une photo', data: 'camera' },
      { text: 'Galerie', data: 'gallery' },
      { text: 'Annuler', role: 'cancel' },
    ],
  });
  await actionSheet.present();
  const { data } = await actionSheet.onDidDismiss();

  if (!data) return null;

  const source = data === 'camera' ? CameraSource.Camera : CameraSource.Photos;

  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source,
      quality: 80,
      allowEditing: false,
      width: 1200,
      height: 1200,
    });

    if (!photo.dataUrl) return null;

    // Convertir le data URL en File
    const response = await fetch(photo.dataUrl);
    const blob = await response.blob();
    const ext = photo.format || 'jpeg';
    const file = new File([blob], `photo_${Date.now()}.${ext}`, { type: `image/${ext}` });
    const previewUrl = photo.dataUrl;

    return { file, previewUrl };
  } catch {
    // L'utilisateur a annulé ou erreur
    return null;
  }
}

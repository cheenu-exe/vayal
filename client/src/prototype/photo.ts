export function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file for machinery photographs."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("This image could not be read in the browser."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("This image format could not be previewed."));
      image.onload = () => {
        const longest = Math.max(image.naturalWidth, image.naturalHeight);
        const scale = Math.min(1, 1000 / longest);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Image preview is unavailable in this browser."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

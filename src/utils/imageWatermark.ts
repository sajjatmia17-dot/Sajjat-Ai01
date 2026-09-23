// Sajjat AI Image Watermark & Branding Engine

export interface WatermarkOptions {
  logoText?: string;
  subText?: string;
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  quality?: number; // 0.1 to 1.0
}

/**
 * Loads an image from URL/Base64, renders it on a canvas,
 * and permanently bakes the stylish 'Sajjat AI' logo badge onto the bottom.
 */
export async function applySajjatAiWatermark(
  imageSrc: string,
  options: WatermarkOptions = {}
): Promise<string> {
  const {
    logoText = "Sajjat AI",
    subText = "Official AI Art",
    position = "bottom-right",
    quality = 0.95,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        const w = img.naturalWidth || img.width || 1024;
        const h = img.naturalHeight || img.height || 1024;

        canvas.width = w;
        canvas.height = h;

        // Draw original image
        ctx.drawImage(img, 0, 0, w, h);

        // Calculate scaling factor based on image width
        const scale = Math.max(0.6, Math.min(w / 800, 2.0));

        // Watermark badge dimensions
        const badgePaddingX = 18 * scale;
        const badgePaddingY = 10 * scale;
        const fontSize = Math.round(18 * scale);
        const subFontSize = Math.round(10 * scale);
        const iconSize = Math.round(20 * scale);

        ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
        const textMetrics = ctx.measureText(logoText);
        const textWidth = textMetrics.width;

        ctx.font = `${subFontSize}px 'Inter', 'Segoe UI', sans-serif`;
        const subMetrics = ctx.measureText(subText);
        const subWidth = subMetrics.width;

        const contentWidth = iconSize + 10 * scale + Math.max(textWidth, subWidth);
        const badgeWidth = contentWidth + badgePaddingX * 2;
        const badgeHeight = fontSize + subFontSize + 14 * scale + badgePaddingY * 2;
        const borderRadius = 14 * scale;

        const margin = 24 * scale;
        let badgeX = w - badgeWidth - margin;
        const badgeY = h - badgeHeight - margin;

        if (position === "bottom-left") {
          badgeX = margin;
        } else if (position === "bottom-center") {
          badgeX = (w - badgeWidth) / 2;
        }

        // Draw soft dark shadow under the badge
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 16 * scale;
        ctx.shadowOffsetY = 4 * scale;

        // Draw Badge Background (Deep Slate Glass)
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
        } else {
          ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
        }
        ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
        ctx.fill();
        ctx.restore();

        // Draw Badge Border with Neon Gradient
        ctx.save();
        const borderGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY + badgeHeight);
        borderGrad.addColorStop(0, "rgba(99, 102, 241, 0.8)"); // Indigo
        borderGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.8)"); // Cyan
        borderGrad.addColorStop(1, "rgba(168, 85, 247, 0.8)"); // Purple

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
        } else {
          ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
        }
        ctx.lineWidth = Math.max(1.5, 2 * scale);
        ctx.strokeStyle = borderGrad;
        ctx.stroke();
        ctx.restore();

        // Draw Icon (Glowing ⚡ Lightning Spark)
        const iconCenterX = badgeX + badgePaddingX + iconSize / 2;
        const iconCenterY = badgeY + badgeHeight / 2;

        ctx.save();
        // Draw icon circular glow
        const glowGrad = ctx.createRadialGradient(
          iconCenterX,
          iconCenterY,
          2 * scale,
          iconCenterX,
          iconCenterY,
          iconSize
        );
        glowGrad.addColorStop(0, "rgba(6, 182, 212, 0.5)");
        glowGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(iconCenterX, iconCenterY, iconSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw Lightning Icon
        ctx.translate(iconCenterX, iconCenterY);
        ctx.beginPath();
        ctx.moveTo(1 * scale, -8 * scale);
        ctx.lineTo(-6 * scale, 1 * scale);
        ctx.lineTo(-1 * scale, 1 * scale);
        ctx.lineTo(-2 * scale, 8 * scale);
        ctx.lineTo(6 * scale, -1 * scale);
        ctx.lineTo(1 * scale, -1 * scale);
        ctx.closePath();

        const iconGrad = ctx.createLinearGradient(-6 * scale, -8 * scale, 6 * scale, 8 * scale);
        iconGrad.addColorStop(0, "#38bdf8"); // Sky
        iconGrad.addColorStop(1, "#818cf8"); // Indigo
        ctx.fillStyle = iconGrad;
        ctx.fill();
        ctx.restore();

        // Draw Text "Sajjat AI"
        const textStartX = badgeX + badgePaddingX + iconSize + 10 * scale;
        const titleY = badgeY + badgePaddingY + fontSize;

        ctx.save();
        ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4 * scale;
        ctx.fillText(logoText, textStartX, titleY);

        // Draw Subtext "Official AI Art"
        const subY = titleY + subFontSize + 3 * scale;
        ctx.font = `600 ${subFontSize}px 'Inter', 'Segoe UI', sans-serif`;
        ctx.fillStyle = "#38bdf8"; // Cyan color
        ctx.letterSpacing = "0.5px";
        ctx.fillText(subText.toUpperCase(), textStartX, subY);
        ctx.restore();

        // Export watermarked image as high-res data URL
        const watermarkedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(watermarkedDataUrl);
      } catch (err) {
        console.warn("Watermark rendering fallback:", err);
        resolve(imageSrc);
      }
    };

    img.onerror = (err) => {
      console.warn("Image load error for watermark:", err);
      resolve(imageSrc);
    };

    img.src = imageSrc;
  });
}

/**
 * Trigger client download for watermarked image
 */
export function downloadWatermarkedImage(
  dataUrlOrSrc: string,
  fileName = "Sajjat_AI_Generated_Image.jpg"
) {
  const link = document.createElement("a");
  link.href = dataUrlOrSrc;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

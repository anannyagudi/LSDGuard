import cv2
import numpy as np

def analyze_patches(image_path):

    image = cv2.imread(image_path)

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    _, mask = cv2.threshold(
        gray,
        80,
        255,
        cv2.THRESH_BINARY_INV
    )

    dark_pixels = np.sum(mask > 0)

    total_pixels = (
        image.shape[0]
        * image.shape[1]
    )

    patch_percent = (
        dark_pixels / total_pixels
    ) * 100

    return round(
        patch_percent,
        2
    )
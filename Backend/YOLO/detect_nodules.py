# from ultralytics import YOLO
# from PIL import Image

# model = YOLO(
#     r"C:\Users\Chinmayee\Desktop\LSD_Guard\Backend\YOLO\runs\detect\train-2\weights\best.pt"
# )

# def detect_nodules(image_path):

#     results = model(image_path)

#     image = Image.open(image_path)

#     image_width, image_height = image.size

#     image_area = image_width * image_height

#     nodule_count = 0

#     affected_area = 0

#     for result in results:

#         boxes = result.boxes

#         nodule_count += len(boxes)

#         for box in boxes:

#             x1, y1, x2, y2 = box.xyxy[0]

#             width = x2 - x1
#             height = y2 - y1

#             affected_area += float(
#                 width * height
#             )

#     coverage_percent = (
#         affected_area / image_area
#     ) * 100

#     # Nodule Density: combines coverage + count
#     # Each detected nodule adds 5% density
#     nodule_density = min(
#         coverage_percent + (nodule_count * 5),
#         100
#     )

#     return {
#         "nodule_count": int(nodule_count),
#         "coverage_percent": round(
#             min(coverage_percent, 100), 2
#         ),
#         "nodule_density": round(
#             nodule_density, 2
#         )
#     }
import os
from ultralytics import YOLO
from PIL import Image

BASE_DIR = os.path.dirname(__file__)

model_path = os.path.join(
    BASE_DIR,
    "runs",
    "detect",
    "train-2",
    "weights",
    "best.pt"
)

model = YOLO(model_path)
def detect_nodules(image_path):

    results = model(image_path)

    image = Image.open(image_path)

    image_width, image_height = image.size

    image_area = image_width * image_height

    nodule_count = 0

    affected_area = 0

    for result in results:

        boxes = result.boxes

        nodule_count += len(boxes)

        for box in boxes:

            x1, y1, x2, y2 = box.xyxy[0]

            width = x2 - x1
            height = y2 - y1

            affected_area += float(
                width * height
            )

    coverage_percent = (
        affected_area / image_area
    ) * 100

    # Nodule Density: combines coverage + count
    # Each detected nodule adds 5% density
    nodule_density = min(
        coverage_percent + (nodule_count * 5),
        100
    )

    return {
        "nodule_count": int(nodule_count),
        "coverage_percent": round(
            min(coverage_percent, 100), 2
        ),
        "nodule_density": round(
            nodule_density, 2
        )
    }
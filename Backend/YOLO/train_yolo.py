from ultralytics import YOLO

model = YOLO("yolov8n.pt")

model.train(
    data=r"C:\Users\Chinmayee\Desktop\LSD_Guard\dataset\data.yaml",
    epochs=50,
    imgsz=640,
    batch=8
)
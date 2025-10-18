import cv2
import numpy as np
from PIL import Image

class CameraManager:
    def __init__(self, camera_index=0):
        """
        Initialize the camera manager.
        iPhone connected via apps like Camo, EpocCam, etc. will appear as a webcam device.
        
        Args:
            camera_index (int): The index of the camera (default is 0, which is usually the first webcam)
        """
        self.camera_index = camera_index
        self.cap = None
    
    def start(self):
        """Start the camera capture"""
        self.cap = cv2.VideoCapture(self.camera_index)
        if not self.cap.isOpened():
            raise Exception(f"Could not open camera at index {self.camera_index}")
        return self.cap.isOpened()
    
    def get_frame(self):
        """Get a frame from the camera"""
        if self.cap is None or not self.cap.isOpened():
            raise Exception("Camera not started")
        
        ret, frame = self.cap.read()
        if not ret:
            return None
        
        # Convert from BGR (OpenCV format) to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        return frame_rgb
    
    def get_frame_as_pil(self):
        """Get a frame from the camera as a PIL Image"""
        frame = self.get_frame()
        if frame is None:
            return None
        return Image.fromarray(frame)
    
    def stop(self):
        """Stop the camera capture"""
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()
    
    def __del__(self):
        """Ensure camera is released when object is deleted"""
        self.stop()


def show_camera_feed(camera_manager, window_name="Camera Feed"):
    """
    Display the camera feed in a window.
    Press 'q' to quit.
    """
    camera_manager.start()
    
    try:
        while True:
            frame = camera_manager.get_frame()
            if frame is None:
                break
                
            # Convert back to BGR for OpenCV display
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            
            # Display the frame
            cv2.imshow(window_name, frame_bgr)
            
            # Break loop on 'q' key press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        camera_manager.stop()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    # Test camera connection
    camera = CameraManager()
    show_camera_feed(camera)

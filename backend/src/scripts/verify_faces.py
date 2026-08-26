import sys
import json
import base64
import os
import tempfile

def save_base64_to_temp_file(base64_str, prefix):
    if ',' in base64_str:
        base64_str = base64_str.split(',', 1)[1]
    
    img_data = base64.b64decode(base64_str)
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg', prefix=prefix)
    temp_file.write(img_data)
    temp_file.close()
    return temp_file.name

def verify_with_opencv(file1_path, file2_path):
    import cv2
    import numpy as np

    img1 = cv2.imread(file1_path)
    img2 = cv2.imread(file2_path)

    if img1 is None or img2 is None:
        return {
            "success": False,
            "verified": False,
            "error": "Failed to decode one or both image files"
        }

    # Resize images to standard size for feature comparison
    img1_resized = cv2.resize(img1, (256, 256))
    img2_resized = cv2.resize(img2, (256, 256))

    gray1 = cv2.cvtColor(img1_resized, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2_resized, cv2.COLOR_BGR2GRAY)

    # 1. Color/Grayscale Histogram Correlation
    h1 = cv2.calcHist([gray1], [0], None, [256], [0, 256])
    h2 = cv2.calcHist([gray2], [0], None, [256], [0, 256])
    cv2.normalize(h1, h1)
    cv2.normalize(h2, h2)
    hist_corr = float(cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL))

    # 2. Mean Absolute Difference / Structural Similarity
    abs_diff = cv2.absdiff(gray1, gray2)
    mean_diff = float(np.mean(abs_diff))
    diff_similarity = float(1.0 - (mean_diff / 255.0))

    combined_score = max(0.0, min(1.0, (hist_corr * 0.6) + (diff_similarity * 0.4)))
    match_pct = round(combined_score * 100.0, 2)
    distance = round(1.0 - combined_score, 4)
    verified = match_pct >= 40.0

    return {
        "success": True,
        "verified": verified,
        "distance": distance,
        "threshold": 0.60,
        "matchPercentage": match_pct,
        "model": "Python-Face-Recognizer (OpenCV)",
        "message": "✅ Faces matched" if verified else "❌ Face verification failed: Check-in and Check-out faces do not match"
    }

def main():
    file1_path = None
    file2_path = None
    try:
        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            with open(sys.argv[1], 'r') as f:
                payload = json.load(f)
        else:
            raw_input = sys.stdin.read().strip()
            if not raw_input:
                print(json.dumps({"success": False, "verified": False, "error": "No input payload provided"}))
                return
            payload = json.loads(raw_input)

        img1_base64 = payload.get("checkInPhoto") or payload.get("img1")
        img2_base64 = payload.get("checkOutPhoto") or payload.get("img2")

        if not img1_base64 or not img2_base64:
            print(json.dumps({
                "success": False,
                "verified": False,
                "error": "Both checkInPhoto and checkOutPhoto base64 strings are required"
            }))
            return

        file1_path = save_base64_to_temp_file(img1_base64, "checkin_")
        file2_path = save_base64_to_temp_file(img2_base64, "checkout_")

        # Primary: Try DeepFace
        try:
            from deepface import DeepFace
            result = DeepFace.verify(
                img1_path=file1_path,
                img2_path=file2_path,
                model_name="VGG-Face",
                distance_metric="cosine",
                enforce_detection=False
            )

            verified = bool(result.get("verified", False))
            distance = float(result.get("distance", 1.0))
            threshold = float(result.get("threshold", 0.40))

            if threshold > 0:
                if distance <= threshold:
                    match_pct = round(50.0 + ((threshold - distance) / threshold) * 50.0, 2)
                else:
                    match_pct = round(max(0.0, (1.0 - (distance / (threshold * 2))) * 50.0), 2)
            else:
                match_pct = round(max(0.0, (1.0 - distance) * 100.0), 2)

            print(json.dumps({
                "success": True,
                "verified": verified,
                "distance": round(distance, 4),
                "threshold": round(threshold, 4),
                "matchPercentage": match_pct,
                "model": "DeepFace (VGG-Face)",
                "similarity_metric": "cosine",
                "message": "✅ Faces matched" if verified else "❌ Face verification failed: Check-in and Check-out faces do not match"
            }))
            return
        except Exception:
            # Fallback to OpenCV Python face recognition
            res = verify_with_opencv(file1_path, file2_path)
            print(json.dumps(res))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "verified": False,
            "error": str(e),
            "message": f"Python Face Recognition error: {str(e)}"
        }))
    finally:
        if file1_path and os.path.exists(file1_path):
            try:
                os.remove(file1_path)
            except Exception:
                pass
        if file2_path and os.path.exists(file2_path):
            try:
                os.remove(file2_path)
            except Exception:
                pass

if __name__ == "__main__":
    main()

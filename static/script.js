const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const emotionResults = document.getElementById("emotionResults");
const startBtn = document.getElementById("startBtn");

let modelsLoaded = false;

async function loadModels() {
    try {
        emotionResults.innerHTML = "Loading AI models...";

        // Load models from static/models
        await faceapi.nets.tinyFaceDetector.loadFromUri("/static/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/static/models");

        modelsLoaded = true;
        emotionResults.innerHTML = "Models loaded. Click Start Camera.";

        console.log("Models loaded successfully!");

    } catch (error) {
        console.error("Model loading error:", error);
        emotionResults.innerHTML = "Failed to load AI models.";
    }
}

// Load models automatically
loadModels();

startBtn.addEventListener("click", async () => {

    if (!modelsLoaded) {
        alert("Models are still loading. Please wait.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        video.srcObject = stream;

    } catch (err) {
        console.error(err);
        alert("Unable to access camera.");
    }
});

video.addEventListener("play", () => {

    const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight
    };

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {

        const detections = await faceapi
            .detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
        );

        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let resultHTML = "";

        resizedDetections.forEach((detection, index) => {

            const box = detection.detection.box;

            const expressions = detection.expressions;

            const dominantEmotion = Object.keys(expressions).reduce(
                (a, b) => expressions[a] > expressions[b] ? a : b
            );

            const confidence =
                expressions[dominantEmotion] * 100;

            // Draw rectangle
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 3;

            ctx.strokeRect(
                box.x,
                box.y,
                box.width,
                box.height
            );

            // Draw text
            ctx.fillStyle = "#00ff00";
            ctx.font = "18px Arial";

            ctx.fillText(
                `${dominantEmotion.toUpperCase()} (${confidence.toFixed(1)}%)`,
                box.x,
                box.y - 10
            );

            resultHTML += `
                Person ${index + 1}: 
                ${dominantEmotion.toUpperCase()}
                (${confidence.toFixed(1)}%)<br>
            `;
        });

        if (resizedDetections.length === 0) {
            emotionResults.innerHTML = "No face detected";
        } else {
            emotionResults.innerHTML = resultHTML;
        }

    }, 100);   // Updates every 100ms (~10 FPS)
});
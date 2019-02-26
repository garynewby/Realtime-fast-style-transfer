'use strict';

let $ = (q, e) => (e || document).querySelector(q);
let dnn = null;
let flagPaused = true;
let $input, $output;
let inputView, outputView;
let ctxIn, ctxOut;
let h, w;
let loaded = false;
let currentStyle = "false";

function togglePause() {
    if (!loaded) return;

    flagPaused = !flagPaused;

    if (flagPaused) {
        setStatus('CLICK TO START');
    } else {
        setStatus('PROCESSING ' + currentStyle);
        mainRoutine();
    }
}

async function initialize(style, name) {
    loaded = false;
    try {
        currentStyle = name;
        setStatus('LOADING ' + currentStyle + '...');
        dnn = await WebDNN.load(style, { backendOrder: ['webgl'] });
        console.log(`backend: ${dnn.backendName}`);
        loaded = true;

        Webcam.set({
            dest_width: 192,
            dest_height: 144,
            flip_horiz: true,
            image_format: 'png'
        });
        Webcam.on('error', (err) => {
            throw err;
        });
        Webcam.on('live', () => {
            setStatus('CLICK TO START');
        });
        Webcam.attach('.CameraLayer');

        $input = $('#snap');
        $output = $('#result');
        inputView = dnn.getInputViews()[0].toActual();
        outputView = dnn.getOutputViews()[0].toActual();
        ctxIn = $input.getContext('2d');
        ctxOut = $output.getContext('2d');
        h = $output.height;
        w = $output.width;

    } catch (err) {
        console.log(err);
        setStatus(`Error: ${err.message}`);
    }
}

async function snap() {
    return new Promise(resolve => Webcam.snap(resolve, $('#snap')));
}

async function mainRoutine() {
    if (flagPaused) return;

    await snap();
    getImageData();

    await dnn.run();
    setImageData();

    requestAnimationFrame(mainRoutine);
}

function getImageData() {
    let pixelData = ctxIn.getImageData(0, 0, w, h).data;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            inputView[(0 * h + y) * w + x] = pixelData[(y * w + x) * 4];
            inputView[(1 * h + y) * w + x] = pixelData[(y * w + x) * 4 + 1];
            inputView[(2 * h + y) * w + x] = pixelData[(y * w + x) * 4 + 2];
        }
    }
}

function setImageData() {
    let imageData = new ImageData(w, h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            imageData.data[(y * w + x) * 4] = outputView[(0 * h + y) * w + x];
            imageData.data[(y * w + x) * 4 + 1] = outputView[(1 * h + y) * w + x];
            imageData.data[(y * w + x) * 4 + 2] = outputView[(2 * h + y) * w + x];
            imageData.data[(y * w + x) * 4 + 3] = 255;
        }
    }

    ctxOut.putImageData(imageData, 0, 0);
}

function setStatus(status) {
    $('#status').textContent = status;
}

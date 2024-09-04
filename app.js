document.getElementById('audioFiles').addEventListener('change', updateFileList);
document.getElementById('combineButton').addEventListener('click', combineAudios);

function updateFileList() {
    const fileListContent = document.getElementById('fileListContent');
    const fileListContainer = document.getElementById('fileList');
    const files = document.getElementById('audioFiles').files;

    fileListContent.innerHTML = ''; // Limpiar la lista actual

    if (files.length === 0) {
        fileListContainer.classList.add('hidden');
        return;
    }

    fileListContainer.classList.remove('hidden');
    const ul = document.createElement('ul');
    for (const file of files) {
        const li = document.createElement('li');
        li.textContent = file.name;
        ul.appendChild(li);
    }
    fileListContent.appendChild(ul);
}

async function combineAudios() {
    const audioFiles = document.getElementById('audioFiles').files;
    if (audioFiles.length === 0) {
        alert('Please, select atleast one file');
        return;
    }

    // Deshabilitar el botón y mostrar la barra de progreso
    document.getElementById('combineButton').disabled = true;
    document.getElementById('progressContainer').classList.remove('hidden');
    updateProgress(0);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const gapDuration = 2; // segundos de pausa entre audios
    const buffers = [];

    for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        buffers.push(audioBuffer);
        updateProgress(((i + 1) / audioFiles.length) * 50); // Actualiza progreso hasta 50%
    }

    const totalDuration = buffers.reduce((sum, buffer) => sum + buffer.duration, 0) + gapDuration * (buffers.length - 1);
    const combinedBuffer = audioContext.createBuffer(2, totalDuration * audioContext.sampleRate, audioContext.sampleRate);

    let offset = 0;
    buffers.forEach((buffer, index) => {
        for (let channel = 0; channel < combinedBuffer.numberOfChannels; channel++) {
            combinedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset * audioContext.sampleRate);
        }
        offset += buffer.duration + gapDuration;
        updateProgress(50 + ((index + 1) / buffers.length) * 50); // Actualiza progreso hasta 100%
    });

    const audioBlob = bufferToWave(combinedBuffer, combinedBuffer.length);
    const audioURL = URL.createObjectURL(audioBlob);

    document.getElementById('audioPreview').src = audioURL;
    document.getElementById('downloadLink').href = audioURL;
    document.getElementById('downloadLink').classList.remove('hidden');

    // Reestablecer el botón y ocultar la barra de progreso
    document.getElementById('combineButton').disabled = false;
    document.getElementById('progressContainer').classList.add('hidden');
}

function updateProgress(value) {
    document.getElementById('progressBar').style.width = `${value}%`;
}

function bufferToWave(buffer, len) {
    let numOfChan = buffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        outputBuffer = new ArrayBuffer(length),
        view = new DataView(outputBuffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);

    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([outputBuffer], { type: "audio/wav" });

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

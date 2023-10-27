function getfrequency(blob) {
    return new Promise((resolve, reject) => {
        const audioContext = new AudioContext();
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob);
        reader.onload = function() {
            audioContext.decodeAudioData(reader.result, function(buffer) {
                const channelData = buffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < channelData.length; i++) {
                    sum += Math.abs(channelData[i]);
                }
                const averageFrequency = sum / channelData.length;
                resolve(averageFrequency);
            }, reject);
        };
    });
}

async function recordAndCalculateFrequency() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        getfrequency(audioBlob).then(frequency => {
            console.log(`As a function call: ${frequency}`);
        });
    });

    mediaRecorder.start();

    setTimeout(() => {
        mediaRecorder.stop();
    }, 1800);
}

const letters = ['a', 'h', 'j', 'l', 'm', 'o', 'q', 'r', 's', 't', 'u', 'w', 'x', 'y', 'z'];

var running = false;
const n = 2;

async function runtask() {
    running = true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audio = new Audio();
    let prevletters = []; 
    function playletter() {
        if (Math.random() < 0.25 && prevletters.length >= n) {
            audio.src = `${prevletters[0]}.wav`;
            prevletters.push(prevletters[0]);
        }
        else {
            let letter;
            while(true) {
                letter = letters[Math.floor(Math.random() * letters.length)];
                if (prevletters.length < n || letter != prevletters[0]) {
                    break;
                }
            }
            audio.src = `${letter}.wav`;
            prevletters.push(letter);
        }
        if (prevletters.length > n) {
            prevletters.shift();
        }
        audio.currentTime = 0;
        audio.play();
    }
    while (running) {
        // Play letter (700 ms)
        playletter();
        let playtime = Date.now();
        await new Promise((resolve, _) => {
            setTimeout(resolve, 700);
        });

        // Record sound (2000 ms)
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];
        const chunkpromise = new Promise((resolve, _) => {
            mediaRecorder.addEventListener("dataavailable", (event) => resolve(event.data));
        });
        const blobpromise = new Promise((resolve, _) => {
            mediaRecorder.addEventListener("stop", () =>
                resolve(new Blob(audioChunks, { type: 'audio/wav' })));
        });
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 2000)
        const chunk = await chunkpromise;
        audioChunks.push(chunk);
        const audioBlob = await blobpromise;
        const frequency = await getfrequency(audioBlob);
        console.log(frequency);
        await new Promise((resolve, _) => {
            setTimeout(resolve, 3000 - Date.now() + playtime);
        });
    }
}

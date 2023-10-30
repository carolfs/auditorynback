function getmagnitude(blob) {
    return new Promise((resolve, reject) => {
        const audioContext = new AudioContext();
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob);
        reader.onload = function() {
            audioContext.decodeAudioData(reader.result, function(audioBuffer) {
                var maxAmplitude = 0;
                for (var i = 0; i < audioBuffer.numberOfChannels; i++) {
                  var channelData = audioBuffer.getChannelData(i);
                  for (var j = 0; j < channelData.length; j++) {
                    var amplitude = Math.abs(channelData[j]);
                    if (amplitude > maxAmplitude) {
                      maxAmplitude = amplitude;
                    }
                  }
                }
                resolve(maxAmplitude);
            }, reject);
        };
    });
}

const letters = ['a', 'h', 'j', 'l', 'm', 'o', 'q', 'r', 's', 't', 'u', 'w', 'x', 'y', 'z'];

var running = false;
var threshold = 0.8;
var n = 2;

function updatelevel() {
    const levelfield = document.getElementById("tasklevel");
    const newlevel = Number(levelfield.value);
    if (isNaN(newlevel) || newlevel < 1 || newlevel > 4) {
        levelfield.value = 2;
        n = 2;
    }
    else {
        n = newlevel;
    }
}

function updatethreshold() {
    const thresholdfield = document.getElementById("threshold");
    const newthreshold = Number(thresholdfield.value);
    if (isNaN(newthreshold) || newthreshold < 0 || newthreshold > 100) {
        thresholdfield.value = 80;
        threshold = 0.8;
    }
    else {
        threshold = 0.01*newthreshold;
    }
}

async function testrecord() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recordbutton = document.getElementById("recordbutton");
    const recordresults = document.getElementById("recordresults");
    recordbutton.disabled = true;
    recordresults.innerHTML = "";
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
    const magnitude = await getmagnitude(audioBlob);
    recordresults.innerHTML = (magnitude > threshold) ? "RESPONSE" : "NO RESPONSE";
    recordbutton.disabled = false;
}

async function runtask() {
    running = true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audio = new Audio();
    let prevletters = []; 
    let match = false;
    function playletter() {
        match = Math.random() < 0.25 && prevletters.length >= n;
        if (match) {
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

        // Record sound
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
        setTimeout(() => mediaRecorder.stop(), 1500)
        const chunk = await chunkpromise;
        audioChunks.push(chunk);
        const audioBlob = await blobpromise;
        const magnitude = await getmagnitude(audioBlob);
        console.log(magnitude);
        if (magnitude > threshold) {
            audio.src = match ? 'match.wav' : 'falsealarm.wav';
            audio.currentTime = 0;
            audio.play();   
        }
        await new Promise((resolve, _) => {
            setTimeout(resolve, 3000 - Date.now() + playtime);
        });
    }
}

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
var threshold;
var n;

// Init threshold and level
function init() {
    const levelfield = document.getElementById("tasklevel");
    const thresholdfield = document.getElementById("threshold");
    if (getCookie("level") !== undefined) {
        levelfield.value = getCookie("level");
    }
    else {
        levelfield.value = 2;
    }
    if (getCookie("threshold") !== undefined) {
        thresholdfield.value = getCookie("threshold") * 100;
    }
    else {
        thresholdfield.value = 30;
    }
}

function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

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
    const d = new Date();
    d.setTime(d.getTime() + (60*24*60*60*1000));
    document.cookie = `level=${n}; expires=${d.toUTCString()}`;
}

function updatethreshold() {
    const thresholdfield = document.getElementById("threshold");
    const newthreshold = Number(thresholdfield.value);
    if (isNaN(newthreshold) || newthreshold < 0 || newthreshold > 100) {
        thresholdfield.value = 30;
        threshold = 0.3;
    }
    else {
        threshold = 0.01*newthreshold;
    }
    const d = new Date();
    d.setTime(d.getTime() + (60*24*60*60*1000));
    document.cookie = `threshold=${threshold}; expires=${d.toUTCString()}`;
}

init();

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
    if (magnitude > threshold) {
        recordresults.style.color = "green";
        recordresults.innerHTML = "RESPONSE";
    }
    else {
        recordresults.style.color = "red";
        recordresults.innerHTML = "NO RESPONSE";
    }
    recordbutton.disabled = false;
}

function calcperformance(correct, wrong, misses, total) {
    if (total == 0) return 0.;
    let lowscore = (total - correct - misses)/total;
    let curscore = (total - wrong - misses)/total;
    let performance = (curscore - lowscore)/(1 - lowscore);
    if (isNaN(performance)) return 0.;
    return performance;
}

async function runtask() {
    running = true;
    console.log(`n = ${n}, threshold = ${threshold}`);
    const startbutton = document.getElementById("startbutton");
    const stopbutton = document.getElementById("stopbutton");
    const correctscore = document.getElementById("correct");
    const wrongscore = document.getElementById("wrong");
    const missesscore = document.getElementById("misses");
    const performance = document.getElementById("performance");
    let correct = 0;
    let wrong = 0;
    let misses = 0;
    let total = 0;
    correctscore.innerHTML = correct.toString();
    wrongscore.innerHTML = wrong.toString();
    missesscore.innerHTML = misses.toString();
    performance.innerHTML = `${calcperformance(correct, wrong, misses, total)*100}%`;
    startbutton.disabled = true;
    stopbutton.onclick = function() {
        running = false;
    }
    stopbutton.disabled = false;
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
        total += 1;
        if (magnitude > threshold) {
            if (match) {
                audio.src = 'match.wav';
                correct += 1;
            }
            else {
                audio.src = 'falsealarm.wav';
                wrong += 1
            }
            audio.currentTime = 0;
            audio.play();   
        }
        else {
            if (match) {
                misses += 1;
            }
        }
        correctscore.innerHTML = correct.toString();
        wrongscore.innerHTML = wrong.toString();
        missesscore.innerHTML = misses.toString();
        performance.innerHTML = `${Math.round(calcperformance(correct, wrong, misses, total)*100)}%`;
        await new Promise((resolve, _) => {
            setTimeout(resolve, 3000 - Date.now() + playtime);
        });
    }
    startbutton.disabled = false;
    stopbutton.disabled = true;
}

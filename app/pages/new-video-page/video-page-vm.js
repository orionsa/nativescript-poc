const Observable = require("tns-core-modules/data/observable").Observable;
// const Video = require("nativescript-exoplayer").Video;
const { isAndroid } = require("tns-core-modules/platform");

let seekMethod = null;
if (isAndroid) {
  const { SEEK_CLOSEST, SEEK_CLOSEST_SYNC } = android.media.MediaPlayer;
  seekMethod = SEEK_CLOSEST;
}

// viewModel constans in use by setters and getters;
const CURRENT_LOCATION_LEFT = "currentLocationLeft";
const CURRENT_LOCATION_WIDTH = "currentLocationWidth";
const ITEMS = "items";
const DURATION = "duration";
const MIN_SEEK_DURATION = "minSeekDuration";
const MAX_SEEK_DURATION = "maxSeekDuration";
const CURRENT_TIME = "currentTime";
const FRAMES_VIEW_WIDTH = "framesViewWidth";
const IS_PLAYING = "isPlaying";

// const trackDurationMS = 1000 * 1000;// fake track duration will be replaced by actual video length
let cl = 0; // current location left for local use;
let cw = 100; // current location width for local use;
let disableDragFlag = false; // flag to fix conflict between drag and pinch on ios;
let prevScale = 1;
let isForward = true;// flag that represents seek and scroll direction;
let prevTime = 0;

const msToHHMMSS = ms => {
  let seconds = parseInt((ms/1000)%60)
  let minutes = parseInt((ms/(1000*60))%60)
  let hours = parseInt((ms/(1000*60*60))%24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}


const createArray = trackDurationMS => {
  let arr = [];
  for (let i = 0; i < trackDurationMS/1000; i++) {
    arr.push({ index: i, displayVal: msToHHMMSS(i * 1000), ms: i*1000 });
  };
  return arr;
}


function createViewModel({ locationBox, scrollView, framesView, video }) {
  const viewModel = new Observable();
  const trackDurationMS = video.getDuration();
    
  viewModel.set(CURRENT_LOCATION_LEFT, 0);
  viewModel.set(CURRENT_LOCATION_WIDTH, cw);
  const items = createArray(trackDurationMS); // mock video sprits

  viewModel.set(ITEMS, items);
  viewModel.set(DURATION, trackDurationMS);
  viewModel.set(MIN_SEEK_DURATION, 0);
  viewModel.set(MAX_SEEK_DURATION, 0);
  viewModel.set(CURRENT_TIME, 0);
  viewModel.set(FRAMES_VIEW_WIDTH,100);
  viewModel.set(IS_PLAYING, false);

  viewModel.handleDragCurrentTime = args => {
    if (disableDragFlag) {
      return ;
    };
    const { state, deltaX } = args;
    if (state === 1) {
      cl = viewModel.get(CURRENT_LOCATION_LEFT);
    }

    let newLocation = cl + deltaX > 0 ? cl + deltaX : 0;
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    const wrapperSize = locationBox.getActualSize().width;

    if (newLocation + currentLocationWidth > wrapperSize) {
      newLocation = wrapperSize - currentLocationWidth;
    }

    viewModel.set(CURRENT_LOCATION_LEFT, newLocation);
    calcLocationBoxTimeRepresentation();
    moveSeekbarAccordingToPosition();
  };

  viewModel.handleLocationPinch = args => {
    const { scale, state } = args;
    if (state === 1) {
      disableDragFlag = true;
    }
    cw = viewModel.get(CURRENT_LOCATION_WIDTH);
    
    if (state === 3) {
      setTimeout(()=> {
        disableDragFlag = false;
        prevScale = 1;
      }, 250);
    }


    const newWidth = cw - ((scale - prevScale) * (prevScale <= scale ? 50 : 100));
    viewModel.set(CURRENT_LOCATION_WIDTH, newWidth);
    prevScale = scale.toFixed(2);
    calcLocationBoxTimeRepresentation();
  };

  const calcLocationBoxTimeRepresentation = ()=> {
    const wrapperSize = locationBox.getActualSize().width;
    const currentLeft = viewModel.get(CURRENT_LOCATION_LEFT);
    const percent = cw/wrapperSize;
    const msRepresentation = trackDurationMS * percent;
    const positionRepresentation = currentLeft/wrapperSize;
    const minimunDuration = trackDurationMS * positionRepresentation;
    const maxDuration = minimunDuration + msRepresentation;
    const newFramesViewWidth = wrapperSize / percent;

    viewModel.set(FRAMES_VIEW_WIDTH, newFramesViewWidth)
    viewModel.set(MIN_SEEK_DURATION, minimunDuration);
    viewModel.set(MAX_SEEK_DURATION, maxDuration);
  }

  const moveSeekbarAccordingToPosition = () => {
    const wrapperSize = locationBox.getActualSize().width;
    const currentLeft = viewModel.get(CURRENT_LOCATION_LEFT);
    const positionRepresentation = currentLeft/wrapperSize;
    const framesViewWidth = framesView.getActualSize().width;
    const offset = framesViewWidth * (positionRepresentation * 1.5);
    scrollView.scrollToHorizontalOffset(offset, true);
  };

  const moveCurrentLocationBox = () => {
    cl = viewModel.get(CURRENT_LOCATION_LEFT);
    const direction = isForward ? 1 : -1
    let newLocation = cl + direction > 0 ? cl + direction : 0;
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    const wrapperSize = locationBox.getActualSize().width;

    if (newLocation + currentLocationWidth > wrapperSize) {
      newLocation = wrapperSize - currentLocationWidth;
    }

    viewModel.set(CURRENT_LOCATION_LEFT, newLocation);
    // video.seekToTime(newLocation);
    calcLocationBoxTimeRepresentation();
  }

  scrollView.on("scroll", event => {
    const framesViewWidth = framesView.getActualSize().width;
    const min = viewModel.get(MIN_SEEK_DURATION);
    const max = viewModel.get(MAX_SEEK_DURATION);
    const newCurrentTime = trackDurationMS * (event.scrollX / framesViewWidth);
    const prevTime = viewModel.get(CURRENT_TIME);
    isForward = newCurrentTime > prevTime;
    if(!viewModel.get(IS_PLAYING)) {
      // console.log("newCurrentTime ", Math.round(newCurrentTime));
      viewModel.set(CURRENT_TIME, Math.round(newCurrentTime));
      video.seekToTime(Math.round(newCurrentTime));
    }

    if ((newCurrentTime > max / 2) && isForward) {
      moveCurrentLocationBox();
    }
    if ((newCurrentTime - (max / 2) < min) && !isForward) {
      moveCurrentLocationBox();
    }
    
  })

  viewModel.formatTime = time => msToHHMMSS(time);

  calcLocationBoxTimeRepresentation();

  viewModel.togglePlay = ()=> {
    const isPlaying = viewModel.get(IS_PLAYING);
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    };

    viewModel.set(IS_PLAYING, !isPlaying);
  }

  viewModel.onTick = ()=> {// runs every 200 ms
    const currentTime = Math.floor(video.getCurrentTime()/1000);
    if (currentTime !== prevTime) { // used to make sure moveTime gets called every second not 200 ms
      prevTime = currentTime;
      // console.log("onTick ", currentTime);
      moveTime(currentTime);
    }
  }
  const moveTime = ( time )=> {// function that gets called every second when playing video
    const framesViewWidth = framesView.getActualSize().width;
    const duration = viewModel.get(DURATION);
    const max = viewModel.get(MAX_SEEK_DURATION);
    const newCurrentTime = time * 1000;
    // console.log("newCurrentTime ", newCurrentTime)
    viewModel.set(CURRENT_TIME, newCurrentTime);

    const offset = (framesViewWidth/duration) * newCurrentTime;
    // console.log("offset ", offset);
    scrollView.scrollToHorizontalOffset(offset, true);
    if ((newCurrentTime > max / 2)) {
      moveCurrentLocationBox();
    }
  }

  viewModel.incrementSec = ()=> {
    const currentTime = video.getCurrentTime();
    video.seekToTime(currentTime + 100, seekMethod);
  }

  viewModel.decrementSec = ()=> {
    const currentTime = video.getCurrentTime();
    video.seekToTime(currentTime - 100, seekMethod);
  }

  viewModel.isReady = ()=> {// Mother of all hacks to solves IOS not seeking in 100 ms jumps
    video.pause();
    video.seekToTime(0)
  }

  return viewModel;
};

exports.createViewModel = createViewModel;
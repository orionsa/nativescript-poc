const Observable = require("tns-core-modules/data/observable").Observable;
const { isAndroid } = require("tns-core-modules/platform");

let seekMethod = null;
if (isAndroid) {
  const { SEEK_CLOSEST, SEEK_CLOSEST_SYNC } = android.media.MediaPlayer;
  seekMethod = SEEK_CLOSEST;
}

// viewModel constans in use by setters and getters;
const CURRENT_LOCATION_LEFT = "currentLocationLeft";
const CURRENT_LOCATION_WIDTH = "currentLocationWidth";
const DURATION = "duration";
const MIN_SEEK_DURATION = "minSeekDuration";
const MAX_SEEK_DURATION = "maxSeekDuration";
const CURRENT_TIME = "currentTime";
const FRAMES_VIEW_WIDTH = "framesViewWidth";
const IS_PLAYING = "isPlaying";
const PADDING = "padding";
const GRADIENT = "gradient";

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

const generateGradient = width => {
  let colors = "#43C6AC, #191654";
  for (let i = 0; i < (width / 1000); i++) {
    colors += ",#43C6AC, #191654";
  }
  return `linear-gradient(to left, ${colors})`
}


function createViewModel({ locationBox, scrollView, framesView, video }) {
  const viewModel = new Observable();
  viewModel.set(CURRENT_LOCATION_LEFT, 0);
  viewModel.set(CURRENT_LOCATION_WIDTH, cw);
  viewModel.set(DURATION, 0);
  viewModel.set(MIN_SEEK_DURATION, 0);
  viewModel.set(MAX_SEEK_DURATION, 0);
  viewModel.set(CURRENT_TIME, 0);
  viewModel.set(FRAMES_VIEW_WIDTH,100);
  viewModel.set(IS_PLAYING, false);
  // viewModel.set("url", "https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8");
  viewModel.set("url", "https://vod.myplay.com/SBG3/5f96d0259bba7b0010c186a9/2020-12-11_06-09/0/5fd30d243fdb230010a41a83/COMMON/1080/playlist.m3u8");
  viewModel.set(GRADIENT, "linear-gradient(to left, #43C6AC, #191654)")
  viewModel.set(PADDING, 0);

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
    // const maxDuration = viewModel.get(MAX_SEEK_DURATION);
    // const minDuration = viewModel.get(MIN_SEEK_DURATION);
    // let newCurrentTime = (maxDuration - minDuration) / 2 + minDuration;

    // viewModel.set(CURRENT_TIME, ((maxDuration - minDuration) / 2 + minDuration));// looks good;
    scrollView.off("scroll", handleScroll);
    // scrollFlag = false;
    setTimeout(()=> scrollView.on("scroll", handleScroll), 500);// Hack, remove event handler
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
    const currentLeft = viewModel.get(CURRENT_LOCATION_LEFT);
    const currentLocationBoxWidth = locationBox.getActualSize().width;
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    const percent =  (currentLocationBoxWidth - currentLocationWidth) / currentLocationBoxWidth;// check
    const trackDurationMS = viewModel.get(DURATION); 
    const msRepresentation = trackDurationMS - (trackDurationMS * percent);// check
    const positionRepresentation = currentLeft/currentLocationBoxWidth;
    const minDuration = trackDurationMS * positionRepresentation;
    const maxDuration = minDuration + msRepresentation;
    const newFramesViewWidth = (currentLocationBoxWidth/currentLocationWidth) * currentLocationBoxWidth;// check
    const duration = viewModel.get(DURATION);
    const padding = scrollView.getActualSize().width / 2;
    viewModel.set(PADDING, padding);
    viewModel.set(GRADIENT, generateGradient(newFramesViewWidth))
    viewModel.set(FRAMES_VIEW_WIDTH, newFramesViewWidth);
    viewModel.set(MIN_SEEK_DURATION, minDuration);
    viewModel.set(MAX_SEEK_DURATION, maxDuration);

    let newCurrentTime = ((maxDuration - minDuration) / 2 + minDuration);

    if (scrollView.horizontalOffset < padding) {
      const oneSecondPixelRepresentationFramesView = (viewModel.get(FRAMES_VIEW_WIDTH) / duration) * 1000;
      const offsetMinusPadding = scrollView.horizontalOffset - viewModel.get(PADDING);
      const secondsToMove = offsetMinusPadding / oneSecondPixelRepresentationFramesView;
      newCurrentTime = newCurrentTime + (secondsToMove * 1000);
    }

    const oneSecondPixelRepresentationFramesView = (viewModel.get(FRAMES_VIEW_WIDTH) / duration) * 1000;      
    if (newFramesViewWidth - scrollView.horizontalOffset < padding) {
      newCurrentTime = maxDuration - (newFramesViewWidth - scrollView.horizontalOffset) * oneSecondPixelRepresentationFramesView;  
    }


    viewModel.set(CURRENT_TIME, newCurrentTime);
    // viewModel.set(CURRENT_TIME, (maxDuration - minimunDuration)/ 2);
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
    // video.pause();
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    const currentLocationBoxWidth = locationBox.getActualSize().width;
    const duration = viewModel.get(DURATION);
    const oneSecondPixelRepresentation = (currentLocationBoxWidth / duration) * 1000;
    const oneSecondPixelRepresentationFramesView = (viewModel.get(FRAMES_VIEW_WIDTH) / duration) * 1000;
    const offsetMinusPadding = scrollView.horizontalOffset - viewModel.get(PADDING);
    const secondsToMove = offsetMinusPadding / oneSecondPixelRepresentationFramesView;

    let newLocation = secondsToMove * oneSecondPixelRepresentation;
    if (offsetMinusPadding <= 0) {
      newLocation = 0; 
    }
    if (newLocation + currentLocationWidth >= currentLocationBoxWidth) {
      newLocation = currentLocationBoxWidth - currentLocationWidth;
    }

    viewModel.set(CURRENT_LOCATION_LEFT, newLocation);
    // video.seekToTime(newLocation, seekMethod);
    calcLocationBoxTimeRepresentation();
    // video.play();
  }

  
  const handleScroll = event => {
    // video.pause();
    const framesViewWidth = viewModel.get(FRAMES_VIEW_WIDTH);
    const min = viewModel.get(MIN_SEEK_DURATION);
    const max = viewModel.get(MAX_SEEK_DURATION);
    const trackDurationMS = viewModel.get(DURATION); 
    const newCurrentTime = trackDurationMS * (event.scrollX / framesViewWidth);
    const prevTime = viewModel.get(CURRENT_TIME);
    isForward = newCurrentTime > prevTime;
    if(!viewModel.get(IS_PLAYING)) {
      viewModel.set(CURRENT_TIME, Math.round(newCurrentTime));
      video.seekToTime(Math.round(newCurrentTime), seekMethod);
      // video.play();
    }
    
    if ((newCurrentTime > max / 2) && isForward) {
      moveCurrentLocationBox();
    }
    if ((newCurrentTime - (max / 2) < min) && !isForward) {
      moveCurrentLocationBox();
    }
  }
  
  scrollView.on("scroll", handleScroll);

  viewModel.formatTime = time => msToHHMMSS(time);

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
    viewModel.set(CURRENT_TIME, newCurrentTime);

    const offset = (framesViewWidth/duration) * newCurrentTime;
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
    // console.log('isReady');
    const duration = video.getDuration();
    setTimeout(()=> {
      video.pause();
      video.seekToTime(0);
    }, 1500);
    viewModel.set(DURATION, duration);
    calcLocationBoxTimeRepresentation();
  }

  return viewModel;
};

exports.createViewModel = createViewModel;
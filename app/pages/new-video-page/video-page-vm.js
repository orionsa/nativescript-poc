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
    const { state, deltaX } = args;

    if (state === 1) {
      cl = viewModel.get(CURRENT_LOCATION_LEFT);
    }

    let newLocation = cl + deltaX > 0 ? cl + deltaX : 0;
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    const currentLocationBoxWidth = scrollView.getActualSize().width;
    if (newLocation + currentLocationWidth >= locationBox.getActualSize().width) {
      newLocation = currentLocationBoxWidth - currentLocationWidth;
    }
    viewModel.set(CURRENT_LOCATION_LEFT, newLocation);
    moveSeekbarAccordingToLocation();
    // viewModel.set(CURRENT_TIME);
  }

  const calcCurrentTimeFromLocation = ()=> {
    const msInPixel = calcFramesViewMsInPixel();
    const offset = scrollView.horizontalOffset;

    let newCurrentTime = msInPixel * offset;
    // const newCurrentTime = ms / 2 + ;
    
    viewModel.set(CURRENT_TIME, newCurrentTime);

  }

  const moveSeekbarAccordingToLocation = ()=> {
    // calcLocationBoxTimeRepresentationNEW();
    calcCurrentTimeFromLocation();
    const currentLocationBoxWidth = locationBox.getActualSize().width;
    const possibleLeft = currentLocationBoxWidth - viewModel.get(CURRENT_LOCATION_WIDTH);
    const currentLocationLeft = viewModel.get(CURRENT_LOCATION_LEFT);
    const currentLocationLeftPercent = (currentLocationLeft / possibleLeft) * 100;
    
    scrollView.scrollToHorizontalOffset(viewModel.get(FRAMES_VIEW_WIDTH) * (currentLocationLeftPercent / 100)); 
    
  }

  const moveSeekbarAccordingToCurrentTime = ()=> {
    const currentTime = viewModel.get(CURRENT_TIME);
    const duration = viewModel.get(DURATION);
    const currentTimePercent = (currentTime / duration) * 100;
    scrollView.scrollToHorizontalOffset(viewModel.get(FRAMES_VIEW_WIDTH) * (currentTimePercent / 100));


  }

  viewModel.handlePinch = args => {
    const { scale, state } = args;
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    let newWidth = currentLocationWidth + ((scale - prevScale) * 50);
    
    prevScale = scale.toFixed(2); 
    if (newWidth > locationBox.getActualSize().width) {
      newWidth = locationBox.getActualSize().width;
    }

    if (newWidth <= 0) {
      newWidth = 0; 
    }

    viewModel.set(CURRENT_LOCATION_WIDTH, newWidth);
    if (state === 3) {
      setTimeout(()=> {
        // disableDragFlag = false;
        prevScale = 1;
      }, 250);
    }

    calcLocationBoxTimeRepresentationNEW(true);
    calculateFramesViewWidth();
    moveSeekbarAccordingToCurrentTime();
    // const ms = calculateLocationBoxTimeRepresentationMs();
    // console.log(ms);
  }

  const calculateLocationBoxTimeRepresentationMs = ()=> {
    // returns number of milliseconds represented by current location box width;
    const duration = viewModel.get(DURATION);
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    const currentLocationBoxWidth = scrollView.getActualSize().width;
    const percent = (currentLocationWidth / currentLocationBoxWidth) * 100;
    const ms = duration * (percent/100);
    return ms;  
  };

  const calculateLocationBoxMsInPixel = ()=> {
    // returns number in milliseconds represnted by single pixle inside the location box;
    const duration = viewModel.get(DURATION);
    const currentLocationBoxWidth = scrollView.getActualSize().width;

    return duration / currentLocationBoxWidth;
  };

  const calculateCurrentLocationPercent = ()=> {
    // returns percent number that represents the current percentage of the current location (from currentLocationBox);
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    const currentLocationBoxWidth = scrollView.getActualSize().width;
    const percent = (currentLocationWidth / currentLocationBoxWidth) * 100;
    
    return percent;
  };

  const calcFramesViewMsInPixel = ()=> {
    // returns number in milliseconds that represents the amount of milliseconds inside single pixel
    const framesViewWidth = viewModel.get(FRAMES_VIEW_WIDTH);
    const duration = viewModel.get(DURATION);
    const msInPixle = duration / framesViewWidth;

    return msInPixle;
  }

  const calculateFramesViewWidth = ()=> {
    const scrollViewWidth = scrollView.getActualSize().width;
    const padding = scrollViewWidth / 2; 
    const currentLocationWidthPercent = calculateCurrentLocationPercent();
    const framesViewWidth = scrollViewWidth / (currentLocationWidthPercent / 100);
    const gradient = generateGradient(framesViewWidth);

    viewModel.set(GRADIENT, gradient);
    viewModel.set(FRAMES_VIEW_WIDTH, framesViewWidth);
    viewModel.set(PADDING, padding);  
  }

  const calcLocationBoxTimeRepresentationNEW = (shouldChangeCurrentTime = false) => {
    const duration = viewModel.get(DURATION);
    const currentTime = viewModel.get(CURRENT_TIME);
    const msRepresentation = calculateLocationBoxTimeRepresentationMs(); 

    let minDuration = currentTime - (msRepresentation / 2);
    let maxDuration = currentTime + (msRepresentation / 2);

    if (minDuration <= 0) {
      maxDuration = maxDuration + (minDuration * -1);
      minDuration = 0; 
    }

    if (maxDuration >= duration) {
      minDuration = minDuration - (maxDuration - duration);
      maxDuration = duration;
    }

    viewModel.set(MIN_SEEK_DURATION, minDuration);
    viewModel.set(MAX_SEEK_DURATION, maxDuration);

    if (shouldChangeCurrentTime) {
      setCurrentLeftByCurrentTime();
    }
  }

  const setCurrentLeftByCurrentTime = ()=> {
    const currentLocationBoxWidth = locationBox.getActualSize().width;
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    const currentTime = viewModel.get(CURRENT_TIME);
    const duration = viewModel.get(DURATION);
    const currentTimePercent = (currentTime / duration) * 100;
    
    let newLeft = (currentLocationBoxWidth * (currentTimePercent / 100)) - (currentLocationWidth / 2);
    if (newLeft <= 0) {
      newLeft = 0;
    }

    if(newLeft + currentLocationWidth >= currentLocationBoxWidth) {
      newLeft = currentLocationBoxWidth - currentLocationWidth; 
    }

    viewModel.set(CURRENT_LOCATION_LEFT, newLeft);
       
  }

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
    // calcLocationBoxTimeRepresentation();
    // video.play();
  }

  
  const handleScroll = event => {
    // video.pause();
    return; // disable function for development
    const framesViewWidth = viewModel.get(FRAMES_VIEW_WIDTH);
    const min = viewModel.get(MIN_SEEK_DURATION);
    const max = viewModel.get(MAX_SEEK_DURATION);
    const trackDurationMS = viewModel.get(DURATION); 
    const newCurrentTime = trackDurationMS * (event.scrollX / framesViewWidth);
    const prevTime = viewModel.get(CURRENT_TIME);
    isForward = newCurrentTime > prevTime;
    if(!viewModel.get(IS_PLAYING)) {
      // viewModel.set(CURRENT_TIME, Math.round(newCurrentTime));
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
    return;// disable function for development
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
    // viewModel.set(CURRENT_TIME, newCurrentTime);

    const offset = (framesViewWidth/duration) * newCurrentTime;
    scrollView.scrollToHorizontalOffset(offset, true);
    if ((newCurrentTime > max / 2)) {
      moveCurrentLocationBox();
    }
  }

  viewModel.incrementSec = ()=> {
    // const currentTime = video.getCurrentTime();
    // video.seekToTime(currentTime + 100, seekMethod);
    const currentLocationWidth = viewModel.get(CURRENT_LOCATION_WIDTH);
    viewModel.set(CURRENT_LOCATION_WIDTH, currentLocationWidth + 20);
  }

  viewModel.decrementSec = ()=> {
    const offset = scrollView.horizontalOffset;
    console.log(offset);
    scrollView.scrollToHorizontalOffset(offset-1);
    // const currentTime = video.getCurrentTime();
    // video.seekToTime(currentTime - 100, seekMethod);
  }

  viewModel.isReady = ()=> {// Mother of all hacks to solves IOS not seeking in 100 ms jumps
    // console.log('isReady');
    const duration = video.getDuration();
    setTimeout(()=> {
      video.pause();
      video.seekToTime(0);
    }, 1500);
    viewModel.set(DURATION, 100000);
    calculateFramesViewWidth();
    // calcLocationBoxTimeRepresentation();
  }

  return viewModel;
};

exports.createViewModel = createViewModel;
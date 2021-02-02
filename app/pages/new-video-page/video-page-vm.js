const Observable = require("tns-core-modules/data/observable").Observable;
const Label = require("tns-core-modules/ui/label").Label
const { isAndroid } = require("tns-core-modules/platform");
const { NEW_CAMERA_URLS } = require("../../utils/constans");

let seekMethod = null;
if (isAndroid) {
  const { SEEK_CLOSEST } = android.media.MediaPlayer;
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
const FIRST_CHILD_WIDTH = "firstChildWidth";
const URL = "url";

let cl = 0; // current location left for local use;
let disableDragFlag = false; // flag to fix conflict between drag and pinch on ios;
let prevScale = 1;
let isForward = true;// flag that represents seek and scroll direction;
let prevTime = 0;
let disableScrollFlag = false;

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
    if (colors.length > 100) {// fix android string length
      break;
    }

    colors += ",#43C6AC, #191654";
  }
 
  return `linear-gradient(to left, ${colors})`
}


function createViewModel({ locationBox, scrollView, video, framesView }) {
  const viewModel = new Observable();
  viewModel.set(CURRENT_LOCATION_LEFT, 0);
  viewModel.set(CURRENT_LOCATION_WIDTH, 100);
  viewModel.set(DURATION, 0);
  viewModel.set(MIN_SEEK_DURATION, 0);
  viewModel.set(MAX_SEEK_DURATION, 0);
  viewModel.set(CURRENT_TIME, 0);
  viewModel.set(FRAMES_VIEW_WIDTH,100);
  viewModel.set(IS_PLAYING, false);
  // viewModel.set("url", "https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8");
  viewModel.set(URL, NEW_CAMERA_URLS.first);
  viewModel.set(GRADIENT, "linear-gradient(to left, #43C6AC, #191654)");
  viewModel.set(PADDING, 0);
  viewModel.set(FIRST_CHILD_WIDTH, 0);



  viewModel.handleDragCurrentTime = args => {
    const { state, deltaX } = args;

    if (disableDragFlag) {
      return;
    }

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
    calcLocationBoxTimeRepresentation();
  }

  const calcCurrentTimeFromLocation = ()=> {
    const msInPixel = calcFramesViewMsInPixel();
    const offset = scrollView.horizontalOffset;
    const newCurrentTime = msInPixel * offset;
    
    viewModel.set(CURRENT_TIME, newCurrentTime);
    video.seekToTime(newCurrentTime, seekMethod);
  }

  const moveSeekbarAccordingToLocation = ()=> {
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
    let newWidth = Math.round(currentLocationWidth + ((scale - prevScale) * -50));
    
    prevScale = scale.toFixed(2); 
    disableDragFlag = true;
    disableScrollFlag = true;
    // scrollView.off("scroll", handleScroll);

    if (newWidth > locationBox.getActualSize().width) {
      newWidth = locationBox.getActualSize().width;
    }
    if (newWidth <= 0) {
      newWidth = 1; 
    }
    // console.log("newWidth ", newWidth);

    viewModel.set(CURRENT_LOCATION_WIDTH, newWidth);
    if (state === 3) {
      setTimeout(()=> {
        disableDragFlag = false;
        prevScale = 1;
        disableScrollFlag = false;
        // scrollView.on("scroll", handleScroll);
      }, 250);
    }

    calcLocationBoxTimeRepresentation(true);
    calculateFramesViewWidth();
    moveSeekbarAccordingToCurrentTime();
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

  // const calculateLocationBoxMsInPixel = ()=> {
  //   // returns number in milliseconds represnted by single pixle inside the location box;
  //   const duration = viewModel.get(DURATION);
  //   const currentLocationBoxWidth = scrollView.getActualSize().width;

  //   return duration / currentLocationBoxWidth;
  // };

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

  const createLabels = ()=> {
    // this method is Hack to overcome elements with over 3955 width disappearance; 
    const totalWidth = viewModel.get(FRAMES_VIEW_WIDTH);
    const maxAllwedWidth = 5955;
    const amountOfLabels = Math.floor(totalWidth/maxAllwedWidth);
    const firstChildWidth = totalWidth - (maxAllwedWidth * amountOfLabels);
    const gradient = generateGradient(firstChildWidth);
    const labelsToAdd = Math.ceil(totalWidth/maxAllwedWidth) - framesView.getChildrenCount();

    viewModel.set(FIRST_CHILD_WIDTH, firstChildWidth);
    viewModel.set(GRADIENT, gradient);
    
    if (labelsToAdd > 0) {
      for(let i = 0; i < labelsToAdd; i++) {
        const singleLabel = new Label();
        singleLabel.style.width = maxAllwedWidth;
        singleLabel.style.backgroundImage = generateGradient(maxAllwedWidth);
        singleLabel.style.height = 60;
        singleLabel.addEventListener("touch", viewModel.addScrollEventListener, this);

        framesView.addChild(singleLabel);
      }
      return;
    }

    if(labelsToAdd < 0) {
      for(let i = labelsToAdd * -1; i > 0; i--) {
        const currentChild = framesView.getChildAt(i);
        if(currentChild) {
          framesView.removeChild(currentChild);
        }
      }
    }
  }

  const calculateFramesViewWidth = ()=> {
    const scrollViewWidth = scrollView.getActualSize().width;
    const padding = scrollViewWidth / 2; 
    const currentLocationWidthPercent = calculateCurrentLocationPercent();
    const framesViewWidth = scrollViewWidth / (currentLocationWidthPercent / 100);
    viewModel.set(FRAMES_VIEW_WIDTH, framesViewWidth);
    
    createLabels();
    viewModel.set(PADDING, padding);  
  }

  const calcLocationBoxTimeRepresentation = (shouldChangeCurrentTime = false) => {
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
    calcLocationBoxTimeRepresentation();
    // video.play();
  }

  
  const handleScroll = event => {
    if(disableScrollFlag) {
      return;
    }
    const framesViewWidth = viewModel.get(FRAMES_VIEW_WIDTH);
    const max = viewModel.get(MAX_SEEK_DURATION);
    const trackDurationMS = viewModel.get(DURATION); 
    const newCurrentTime = trackDurationMS * (event.scrollX / framesViewWidth);
    const prevTime = viewModel.get(CURRENT_TIME);
    isForward = newCurrentTime > prevTime;
    // if(!viewModel.get(IS_PLAYING)) {
    //   viewModel.set(CURRENT_TIME, Math.round(newCurrentTime));
    //   video.seekToTime(Math.round(newCurrentTime), seekMethod);
    //   // video.play();
    // }

    viewModel.set(CURRENT_TIME, Math.round(newCurrentTime));
    if (!isAndroid) {
      video.seekToTime(Math.round(newCurrentTime), seekMethod);
    }
    
    if ((newCurrentTime > max / 2) && isForward) {
      moveCurrentLocationBox();
    }

    if (!isForward && (newCurrentTime + max / 2) > max) {
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
      disableScrollFlag = true;
      video.play();
    };

    viewModel.set(IS_PLAYING, !isPlaying);
  }

  viewModel.onTick = ()=> {// runs every 200 ms
    const currentTime = Math.floor(video.getCurrentTime()/1000);
    if (currentTime !== prevTime) { // used to make sure moveTime gets called every second not 200 ms
      disableScrollFlag = true;
      prevTime = currentTime;
      moveTime(currentTime);
    }
  }

  const moveTime = time => {
    // function that gets called every second when playing video
    const max = viewModel.get(MAX_SEEK_DURATION);
    const newCurrentTime = time * 1000;

    viewModel.set(CURRENT_TIME, newCurrentTime);

    const msInPixel = calcFramesViewMsInPixel();
    const offset = newCurrentTime / msInPixel;
    
    scrollView.scrollToHorizontalOffset(offset);
    
    if (newCurrentTime > max / 2) {
      moveCurrentLocationBox();
    }
  }

  const getNewCurrentTime = timeToChange => {
    const currentTime = video.getCurrentTime();
    const duration = viewModel.get(DURATION);
    let newCurrentTime = currentTime + timeToChange;
    if (newCurrentTime <= 0) {
      newCurrentTime = 0;
    }
    
    if (newCurrentTime >= duration) {
      newCurrentTime = duration;
    }
    moveTime(newCurrentTime/1000);
    return newCurrentTime;
  }

  viewModel.incrementSec = ()=> {
    const newCurrentTime = getNewCurrentTime(1000);
    viewModel.set(CURRENT_TIME, newCurrentTime);
    video.seekToTime(newCurrentTime, seekMethod);
  }

  viewModel.decrementSec = ()=> {
    const newCurrentTime = getNewCurrentTime(-1000);
    viewModel.set(CURRENT_TIME, newCurrentTime);
    video.seekToTime(newCurrentTime, seekMethod);
  }

  viewModel.incrementTenSec = ()=> {
    const newCurrentTime = getNewCurrentTime(10000);
    viewModel.set(CURRENT_TIME, newCurrentTime);
    video.seekToTime(newCurrentTime, seekMethod);
  }

  viewModel.decrementTenSec = ()=> {
    const newCurrentTime = getNewCurrentTime(-10000);
    viewModel.set(CURRENT_TIME, newCurrentTime);
    video.seekToTime(newCurrentTime, seekMethod);
  }

  viewModel.isReady = ()=> {// Mother of all hacks to solve IOS not seeking in 100 ms jumps
    const duration = video.getDuration();
    setTimeout(()=> {
      video.pause();
      video.seekToTime(0);
      viewModel.set(CURRENT_TIME, 0);
      calculateFramesViewWidth();
      calcLocationBoxTimeRepresentation();
    }, 1500);
    viewModel.set(DURATION, duration);
  }

  viewModel.addScrollEventListener = args => {
    const { action } = args;

    if (isAndroid && action === "up") {
      // in android the seek is not in real time but only when the user lifts his finger.
      const newCurrentTime = viewModel.get(CURRENT_TIME);
      video.seekToTime(Math.round(newCurrentTime), seekMethod);
    } 

    if (isAndroid) {
      disableScrollFlag = false;  
    };

    disableScrollFlag = action === "down";
  }

  return viewModel;
};

exports.createViewModel = createViewModel;
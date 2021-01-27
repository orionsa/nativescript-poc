
import { URLS } from "../../utils/constans";
const skipsMS = 250;

let mVideoView = null; 
let mMediaController = null;
let mediaPlayer = null;
let interval = null;
let seek = 0;
let currentVideoIndex = 0;
let isPlaying = true;
let player = null;

function createVideoView(args) {
  
  mVideoView = new android.widget.VideoView(args.context);
  mMediaController = new android.widget.MediaController(args.context);
  mMediaController.setAnchorView(mVideoView);
  //create videoview    

  // parse the uri
  // var videoLink = 'http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4';
  // var videoLink = 'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8';
  // var mVideoURL = android.net.Uri.parse(videoLink);
  // mVideoView.setVideoURI(mVideoURL);
  handleChangeVideo();
  mVideoView.setMediaController(mMediaController);
  mVideoView.requestFocus();
  // mVideoView.start();
  
  
  // mediaPlayer listener
  const mpListener = new android.media.MediaPlayer.OnPreparedListener({
    onPrepared: mp => {
      mp.setVolume(1,1)
      mediaPlayer = mp;
    } 
  });
  
  mVideoView.setOnPreparedListener(mpListener);
  
  // mediaPlayer.start();
  args.view = mVideoView;
  // Create our Complete Listener - this is triggered once a video reaches the end
  var completionListener = new android.media.MediaPlayer.OnCompletionListener({
      onCompletion: function(args) {
          console.log('Video Done');
      }
  });
  // Set the listener using the correct method
  mVideoView.setOnCompletionListener(completionListener);
}

function handleBack() {
  if (seek >= 1000) {
    seek -= skipsMS;
    mediaPlayer.seekTo(seek, android.media.MediaPlayer.SEEK_CLOSEST);
    console.log("handleBack ", seek);  
  }

};

function handleForward() {
  seek += skipsMS;
  // const seekTo = mVideoView.getCurrentPosition();
  // console.log("android.media.MediaPlayer ", android.media.MediaPlayer);
  mediaPlayer.seekTo(seek, android.media.MediaPlayer.SEEK_CLOSEST); 
  // mVideoView.seekTo(seekTo + skipsMS);
  // console.log("handleForward ", seekTo);
}

function handleTouchBack({ action }) {
  if(action === "down") {
    console.log("handlePanBack DOWN");
  return;
  };

  if(action === "up") {
    console.log("handlePanBack UP");
  }
}


function handleTouchForward({ action }) {
  if(action === "down") {
    interval = setInterval(function(){
      handleForward();
    }, skipsMS);
    console.log("handlePanForward DOWN");
    return;
  };

  if(action === "up") {
    clearInterval(interval);
    console.log("handlePanForward UP");
  }
}

function handleChangeVideo() {
  const videoLink = URLS[currentVideoIndex];
  const mVideoURL = android.net.Uri.parse(videoLink);
  mVideoView.setVideoURI(mVideoURL);
  
  if (currentVideoIndex < URLS.length - 1) {
    currentVideoIndex++;
  } else {
    currentVideoIndex = 0;
  }
}


export {
  createVideoView,
  handleBack,
  handleForward,
  handleTouchBack,
  handleTouchForward,
  handleChangeVideo
}
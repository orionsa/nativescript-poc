const Observable = require("tns-core-modules/data/observable").Observable;

const { SKIP_INTERVAL_MS, TENNIS_URLS, URLS } = require("../../utils/constans");
const { SEEK_CLOSEST, SEEK_CLOSEST_SYNC } = android.media.MediaPlayer;

const seekMethod = SEEK_CLOSEST; 

const parseTime = time => Math.round(time / 100) * 100;

function createViewModel({ video, secondVideo }) {
    const viewModel = new Observable();
    let time = 0;
    viewModel.url = TENNIS_URLS[0];
    viewModel.secondUrl = TENNIS_URLS[1]
    viewModel.isPlaying = false;
    viewModel.isFirstPlayerMaster = true;
    viewModel.skipLatency = 500;
    viewModel.skipInterval = 500;
    viewModel.hasSecondPlayer = true;

    // const playBoth = ()=> {
    //     video.play();
    //     if(!viewModel.get("hasSecondPlayer")) {
    //         return;
    //     }
    //     secondVideo.play();
    // };

    const pauseBoth = () => {
        video.pause();
        if(!viewModel.get("hasSecondPlayer")) {
            return;
        }
        secondVideo.pause();
    }

    const getMainPlayerCurrentTime = () => {
        const isMainPlayer = viewModel.get("isFirstPlayerMaster");
        if (isMainPlayer) {
            return time = parseTime(video.getCurrentTime());
        }

        return time = parseTime(secondVideo.getCurrentTime());
    } 

    const seekOnBothPlayers = seekTime => {
        const isMainPlayer = viewModel.get("isFirstPlayerMaster");
        if (isMainPlayer) {
            video.seekToTime(seekTime, seekMethod);
            return ;
        }

        secondVideo.seekToTime(seekTime, seekMethod);
    }
    
    viewModel.handleForward = () => {
        time = getMainPlayerCurrentTime();
        time += viewModel.skipLatency;
        seekOnBothPlayers(time);
    }

    viewModel.handleBack = ()=> {
        // pauseBoth();
        time = getMainPlayerCurrentTime();
        time -= viewModel.skipLatency;
        seekOnBothPlayers(time);
    }

    viewModel.currentTimeUpdated = ()=> {
        console.log("currentTimeUpdated");
    }

    // viewModel.handlePlayPause = ()=> {
    //     const shouldPlay = !viewModel.get("isPlaying");
    //     viewModel.set("isPlaying", !viewModel.get("isPlaying"));

    //     if (shouldPlay) {
    //         playBoth();
    //         return;
    //     }

    //     pauseBoth();
    // }

    viewModel.toggleMasterPlayer = ()=> {
        if(!viewModel.get("hasSecondPlayer")) {
            return;
        }
        const isFirstPlayerActive = viewModel.get("isFirstPlayerMaster");
        const currentTime = getMainPlayerCurrentTime();
        pauseBoth();
        viewModel.set("isFirstPlayerMaster", !isFirstPlayerActive);
        seekOnBothPlayers(currentTime);
    };

    viewModel.handleSwitchVideos = ()=> {
        const isTestVideos = viewModel.url === URLS[0];
        viewModel.set("url", isTestVideos ? TENNIS_URLS[0] : URLS[0]);
        viewModel.set("secondUrl", isTestVideos ? TENNIS_URLS[1] : URLS[0]);
        time = 0;
    };

    viewModel.videoFinished = ()=> {
        console.log("videoFinished");
    }

    viewModel.handleSeekToTimeComplete = ()=> {// doesn't work with exoplayer
        console.log("seekToComplete")
    }

    viewModel.incrementSkipLatency = ()=> {
        if (viewModel.skipLatency >= 1000) {
            return ;
        }
        const newLatency = viewModel.get("skipLatency") + 50; 
        viewModel.set("skipLatency", newLatency);
    }

    viewModel.decrementSkipLatency = ()=> {
        if(viewModel.skipLatency <= 100) {
            return ;
        } 
        const newLatency = viewModel.get("skipLatency") - 50;
        viewModel.set("skipLatency", newLatency);
    }

    viewModel.incrementSkipInterval = ()=> {
        if (viewModel.skipInterval >= 1000) {
            return ;
        }
        const newInterval = viewModel.get("skipInterval") + 50; 
        viewModel.set("skipInterval", newInterval);
    }

    viewModel.decrementSkipInterval = ()=> {
        if(viewModel.skipInterval <= 100) {
            return ;
        } 
        const newInterval = viewModel.get("skipInterval") - 50;
        viewModel.set("skipInterval", newInterval);
    }

    viewModel.killPlayer = ()=> {
        secondVideo.destroy();
        viewModel.set("isFirstPlayerMaster", true);
        viewModel.set("hasSecondPlayer", false);
    }

    viewModel.handleSkipFiveSec = args => {
        const { direction } = args.object;
        const isBack = direction === "back";
        const currentTime = getMainPlayerCurrentTime();
        seekOnBothPlayers(isBack ? currentTime - 5000 : currentTime + 5000);
    }

    return viewModel;
}

exports.createViewModel = createViewModel;

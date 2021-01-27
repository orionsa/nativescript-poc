const Observable = require("tns-core-modules/data/observable").Observable;


const maxDuration = 10000000  ;
const minDuration = 0;
const minimumSeekableTime = 5000

const START_TIME = "startTime";
const END_TIME = "endTime";
const CURRENT_TIME = "currentTime";
const SLIDER_VALUE = "sliderValue";
const SECONDS_TO_TRIM = "secondsToTrim";

// function formatSeconds(seconds) {
//   // seconds -> HH:MM:SS 
//   return new Date(seconds * 1000).toISOString().substr(11, 8)
// }

// function getSliderValue(min, max, value) {
//   return ((value - min) * 100) / (max - min)
// }

function createViewModel({ slider }) {
    const viewModel = new Observable();
    // let secondsToTrimStart = 0;
    // let secondsToTrimEnd = 0;


    // viewModel.set(START_TIME, formatSeconds(minDuration));
    viewModel.set(START_TIME, minDuration);
    viewModel.set(END_TIME,  maxDuration);
    viewModel.set(CURRENT_TIME, 0);
    // viewModel.set(SLIDER_VALUE, 
    //   getSliderValue(minDuration, maxDuration, viewModel.get(CURRENT_TIME))
    // );
    viewModel.set(SLIDER_VALUE, 0)


    viewModel.handlePinch = args => {
      const { scale } = args;
      let msToTrim = Math.round(scale * 10) * 10000;
      if (scale < 1) {
        msToTrim *= -1;
      }
      console.log("msToTrim ", scale);
      const startTime = viewModel.get(START_TIME);
      const endTime = viewModel.get(END_TIME);
      const currentTime = viewModel.get(CURRENT_TIME);
      let newStartTime = startTime + msToTrim;
      let newEndTime = endTime - msToTrim;
      // console.log("newStartTime 1", newStartTime);
      // console.log("newEndTime 1", newEndTime);
      if (newStartTime + minimumSeekableTime >= newEndTime - minimumSeekableTime) {
        const diff = newEndTime - newStartTime;
        newStartTime = newStartTime - diff;
        newEndTime = newEndTime + diff;
      }

      if (newStartTime <= minDuration) {
        newStartTime = minDuration;
      }

      if (newEndTime > maxDuration) {
        newEndTime = maxDuration;
      }
      // console.log("newStartTime 2", newStartTime);
      // console.log("newEndTime 2", newEndTime);
      viewModel.set(START_TIME, newStartTime);
      viewModel.set(END_TIME, newEndTime);
    }
    

    // viewModel.handlePinch = args => {
    //   const { scale } = args;
    //   let totalSecondsToTrim = (Math.round(scale * 10) / 10) * 10000;
    //   // let totalSecondsToTrim = (Math.round(scale * 10) / 10) * 1000;
    //   console.log("totalSecondsToTrim ", totalSecondsToTrim);
    //   if (scale < 1) {
    //     totalSecondsToTrim *= -1
    //   }

    //   const currentTime = viewModel.get(CURRENT_TIME);
    //   const startTime = viewModel.get(START_TIME);
    //   const endTime = viewModel.get(END_TIME);
    //   // const currentSliderValue = viewModel.get(SLIDER_VALUE) / 100;
    //   const currentSliderValue = slider.value / 100;
    //   // console.log("SLIDER?!?!?!? ", slider.value);
    //   // console.log("currentSliderValue ", currentSliderValue);
    //   // let newEndTime = endTime - (totalSecondsToTrim * (1 - currentSliderValue));
    //   // let newStartTime = startTime + (totalSecondsToTrim * (currentSliderValue));
    //   // let newEndTime = endTime - (totalSecondsToTrim * (1 - currentSliderValue));
    //   // let newStartTime = startTime + (totalSecondsToTrim * (currentSliderValue));

    //   // let newEndTime = endTime - (totalSecondsToTrim * (1 - currentSliderValue));
    //   // let newStartTime = startTime + (totalSecondsToTrim * (currentSliderValue));

    //   let newEndTime = endTime - totalSecondsToTrim;
    //   let newStartTime = startTime + totalSecondsToTrim;

    //   // if (newStartTime > newEndTime) {
    //   //   newStartTime = currentTime - minimumSeekableTime <= 0 ? 0 : currentTime - minimumSeekableTime;
    //   //   newEndTime = currentTime + minimumSeekableTime >= maxDuration ? maxDuration : currentTime + minimumSeekableTime;
    //   //   viewModel.set(START_TIME, newStartTime);
    //   //   viewModel.set(END_TIME, newEndTime);
    //   //   return ;
    //   // };

    //   if (newStartTime + minimumSeekableTime > newEndTime - minimumSeekableTime) {
    //     newStartTime = currentTime - minimumSeekableTime <= 0 ? 0 : currentTime - minimumSeekableTime;
    //     newEndTime = currentTime + minimumSeekableTime >= maxDuration ? maxDuration : currentTime + minimumSeekableTime;
    //     viewModel.set(START_TIME, newStartTime);
    //     viewModel.set(END_TIME, newEndTime);
    //     return ;
    //   };

    //   if (newEndTime >= maxDuration) {
    //     newEndTime = maxDuration;
    //   };
      
    //   if (newStartTime <= minDuration) {
    //     newStartTime = minDuration;
    //   };

    //   viewModel.set(START_TIME, newStartTime);
    //   viewModel.set(END_TIME, newEndTime);
    // }

    viewModel.formatSeconds = duration => {
      let seconds = parseInt((duration/1000)%60)
      let minutes = parseInt((duration/(1000*60))%60)
      let hours = parseInt((duration/(1000*60*60))%24);
  
      hours = (hours < 10) ? "0" + hours : hours;
      minutes = (minutes < 10) ? "0" + minutes : minutes;
      seconds = (seconds < 10) ? "0" + seconds : seconds;
  
      return hours + ":" + minutes + ":" + seconds;
    }

    slider.on("valueChange", ({ value }) => { 
      const start = viewModel.get(START_TIME);
      const end = viewModel.get(END_TIME);
      const timeToAdd = (end - start) * value / 100;
      viewModel.set(CURRENT_TIME, Math.round(start + timeToAdd));
      // viewModel.set(SLIDER_VALUE, value);
    });

    return viewModel;
}

exports.createViewModel = createViewModel;
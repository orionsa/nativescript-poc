const Observable = require("tns-core-modules/data/observable").Observable;
const gestures = require("tns-core-modules/ui/gestures");
const { SKIP_INTERVAL_MS } = require("../../utils/constans");
const intervalMS = 750;

function createViewModel({ onBack, onForward, backButton, forwardButton, onClear, skipInterval, killPlayer }) {
  let interval = null;
  const viewModel = new Observable();
    // const backBtn = viewModel.getViewById("backButton");
    viewModel.onBack = () => {
        console.log("Back");
        onBack(); 
    };

    viewModel.onForward = ()=> {
      console.log("Forward");
      onForward();
    }

    viewModel.handleTouchBack = ({ action })=> {
      if (action === "down") {
        // clearInterval(interval);
        interval = setInterval(() => {
          onBack();
        }, skipInterval);
        return ;
      };
      
      if (action === "up") {
        clearInterval(interval);
        return;
      }
    }

    viewModel.handleTouchForward = ({ action }) => {
      // console.log("action ", args.action);
      if (action === "down") {
        clearInterval(interval);
        interval = setInterval(()=> {
          onForward("gbdfhjsbjhdsbghjdf");
          
        }, skipInterval);
        return ;
      };
      
      if (action === "up") {
        clearInterval(interval);
        return;
      }
    }

    viewModel.onClear = ()=> {
      console.log("interval ", interval);
      clearInterval(interval);
      // onClear()
    }

    viewModel.killPlayer = ()=> {
      killPlayer();
    }

    // backButton.on(gestures.GestureTypes.touch, args => {
    //   if (args.action === "down") {
    //     interval = setInterval(()=> {
    //       onBack();
    //     }, SKIP_INTERVAL_MS);
    //   }
      
    //   if (args.action === "up") {
    //     clearInterval(interval);
    //   }
    // });

    // forwardButton.on(gestures.GestureTypes.touch, args => {
    //   // clearInterval(interval);
    //   if (args.action === "down") {
    //     interval = setInterval(()=> {
    //       onForward();
    //     }, SKIP_INTERVAL_MS)
    //   }

    //   if (args.action === "up") {
    //     clearInterval(interval);
    //   }
    // });

    //   console.log("*******************************************************")
    //   console.log("*******************************************************")
    // console.log(gestures);
    // backBtn.on("pan", function(args){
    //   console.log(args)
    // })
    // viewModel.onPan = event => {
    //   console.log("*******************************************************")
    //   console.log("*******************************************************")
    //   console.log("*******************************************************")
    //   console.log(event);
    //   console.log("*******************************************************")
    //   console.log("*******************************************************")
    //   console.log("*******************************************************")
    // }

    return viewModel;
}

exports.createViewModel = createViewModel;
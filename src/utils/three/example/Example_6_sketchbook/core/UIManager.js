
export class UIManager{
    static setUserInterfaceVisible(value){
        document.getElementById("ui-container").style.display = value ? 'block' : 'none';
    }

    static setLoadingScreenVisible(value){
        document.getElementById("loading-screen").style.display = value ? 'flex' : 'none';
    }

    static setFPXVisible(value){
        document.getElementById('statsBox').style.display = value ? 'block' : 'none';
        document.getElementById('dat-gui-container').style.top = value ? '48px' : '0px';
    }
}
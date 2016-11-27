import React from 'react';

export default class ImageEditor extends React.Component {
	static propTypes = {
		dataURL: React.PropTypes.any,
		onLoadError: React.PropTypes.func.isRequired,
		ratio: React.PropTypes.number.isRequired,
		scale: React.PropTypes.number.isRequired,
		angle: React.PropTypes.number.isRequired,
		displayBoxWidth: React.PropTypes.number,
		displayBoxHeight: React.PropTypes.number,
		style: React.PropTypes.object,
		className: React.PropTypes.string
	}
	constructor(props){
		super(props);
		this.state = {
			'offsetX':0,
			'offsetY':0,
			'displayWidth':0,
			'displayHeight':0,

			'b64':null
		}

		if (this.props.displayBoxWidth){
			this.state.displayBoxWidth = this.props.displayBoxWidth;
			this.state.displayBoxHeight = this.state.displayBoxWidth*(1/this.props.ratio);
		}

		if (this.props.displayBoxHeight){
			this.state.displayBoxWidth = this.props.displayBoxHeight;
			this.state.displayBoxHeight = this.state.displayBoxWidth*(this.props.ratio);
		}

		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);

		this.calculate = this.calculate.bind(this);
		this.getImage = this.getImage.bind(this);

		this.setupCanvas();
		this.setupImage();
	}
	componentWillMount(){
		document.body.addEventListener('mouseup', this.onMouseUp);
		document.body.addEventListener('mousemove', this.onMouseMove);
	}
	componentWillUnmount(){
		document.body.removeEventListener('mouseup', this.onMouseUp);
		document.body.addEventListener('mousemove', this.onMouseMove);
	}
	setupCanvas(){
		this.canvas = document.createElement('canvas');
		this.canvasContext = this.canvas.getContext('2d');
	}
	setupImage(){
		this.image = new Image();

		this.image.onload = ()=>{
			this.getImage();
		}

		this.image.onerror = ()=>{
			this.props.onLoadError();
		}

		if (this.props.dataURL){
			if(this.props.dataURL.substring(0,4).toLowerCase()==='http') {
				this.image.crossOrigin = 'anonymous';
			}
			this.image.src = this.props.dataURL;
		}
	}
	componentWillReceiveProps(nextProps){
		if (nextProps.dataURL !== this.props.dataURL){
			this.image.src = nextProps.dataURL;
		} else if (nextProps.angle !== this.props.angle){
			this.getImage(nextProps);
		} else {
			this.calculate(nextProps);
		}
	}
	getImage(props){
		if (!props){
			props = this.props;
		}
		let widthAndHeightReversed = props.angle === 90 || props.angle === 270;
		this.canvas.width = widthAndHeightReversed ? this.image.height : this.image.width;
		this.canvas.height = widthAndHeightReversed ? this.image.width : this.image.height;

		this.canvasContext.save();
		this.canvasContext.fillStyle = '#fff';
		this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

		let drawPositionX = 0;
		let drawPositionY = 0;
		if (props.angle === 90 || props.angle === 180){
			drawPositionY = -this.image.height;
		}
		if (props.angle === 270 || props.angle === 180){
			drawPositionX = -this.image.width;
		}
		
		let radians = props.angle * (Math.PI/180);
		this.canvasContext.rotate(radians);
		this.canvasContext.drawImage(this.image, drawPositionX, drawPositionY);

		this.setState({
			b64: this.canvas.toDataURL("image/jpeg", 0.9)
		});

		this.canvasContext.restore();
		this.calculate(props);
	}
	calculate(props){
		if (!this.image){
			return;
		}
		if (!props){
			props = this.props;
		}

		let nstate = {
			'width':this.canvas.width || 0,
			'height':this.canvas.height || 0
		};

		//Calculate the display box width and height
		if (props.displayBoxWidth){
			nstate.displayBoxWidth = props.displayBoxWidth;
			nstate.displayBoxHeight = nstate.displayBoxWidth*(1/props.ratio);
		}
		if (props.displayBoxHeight){
			nstate.displayBoxWidth = props.displayBoxHeight;
			nstate.displayBoxHeight = nstate.displayBoxWidth*(props.ratio);
		}

		//Calculate the image display width and height in relation to the displaybox and the scale
		let actualImageRatio = (this.canvas.width / this.canvas.height);
		if (props.ratio < actualImageRatio){
			nstate.displayHeight = nstate.displayBoxHeight * props.scale;
			nstate.displayWidth = (this.canvas.width * (nstate.displayHeight / this.canvas.height));
		} else {
			nstate.displayWidth = nstate.displayBoxWidth * props.scale;
			nstate.displayHeight = (this.canvas.height * (nstate.displayWidth / this.canvas.width));
		}

		//Set the offsets
		nstate.offsetX = this.state.offsetX;
		nstate.offsetY = this.state.offsetY;

		//Check if offsets are out of bound
		let diffDisplayX = (nstate.displayBoxWidth - nstate.displayWidth);
		if (nstate.offsetX < diffDisplayX){
			nstate.offsetX = diffDisplayX
		} else if (nstate.offsetX > 0){
			nstate.offsetX = 0;
		}

		let diffDisplayY = (nstate.displayBoxHeight - nstate.displayHeight);
		if (nstate.offsetY < diffDisplayY){
			nstate.offsetY = diffDisplayY
		} else if (nstate.offsetY > 0){
			nstate.offsetY = 0;
		}

		//Calculate relatively displayed width and height
		//the part of the image actually displayed in the displayBox in px
		if (props.ratio < actualImageRatio){
			nstate.relativeDisplayedHeight = (1/props.scale)*this.canvas.height;
			nstate.relativeDisplayedWidth = nstate.relativeDisplayedHeight*props.ratio;
		} else {
			nstate.relativeDisplayedWidth = (1/props.scale)*this.canvas.width;
			nstate.relativeDisplayedHeight = nstate.relativeDisplayedWidth*(1/props.ratio);
		}

		//Set the relative offsets according to the scale
		//These are in the scale of the image
		nstate.relativeOffsetX = (nstate.relativeDisplayedWidth / nstate.displayBoxWidth)*(-nstate.offsetX);
		nstate.relativeOffsetY = (nstate.relativeDisplayedHeight / nstate.displayBoxHeight)*(-nstate.offsetY);

		//Update state
		this.setState(nstate);
	}
	getResized(){
		let tempCanvas = document.createElement('canvas');
		tempCanvas.width = this.state.relativeDisplayedWidth;
		tempCanvas.height = this.state.relativeDisplayedHeight;
		tempCanvas.getContext('2d').drawImage(this.canvas, -this.state.relativeOffsetX, -this.state.relativeOffsetY);
		return tempCanvas;
	}
	getAsDataURL(mimeType,quality){
		return this.getResized().toDataURL(mimeType || "image/jpeg", quality || 0.9);
	}
	getAsBlob(callback,mimeType,quality){
		return this.getResized().toBlob(callback, mimeType || "image/jpeg", quality || 0.9);
	}
	onTouchStart(e){
		let touch = e.changedTouches[0];
		this.touchFromX = parseInt(touch.clientX);
		this.touchFromY = parseInt(touch.clientY);
	}
	onTouchMove(e){
		e.preventDefault();
		let touch = e.changedTouches[0];
		let diffX = this.touchFromX - parseInt(touch.clientX);
		let diffY = this.touchFromY - parseInt(touch.clientY);
		this.touchFromX = parseInt(touch.clientX);
		this.touchFromY = parseInt(touch.clientY);
		this.applyOffset(diffX,diffY);
	}
	onMouseDown(e){
		this.mouseEvent = true;
		let mouse = e;
		this.mouseFromX = parseInt(mouse.clientX);
		this.mouseFromY = parseInt(mouse.clientY);
	}
	onMouseMove(e){
		if (!this.mouseEvent){
			return;
		}
		let mouse = e;
		let diffX = this.mouseFromX - parseInt(mouse.clientX);
		let diffY = this.mouseFromY - parseInt(mouse.clientY);
		this.mouseFromX = parseInt(mouse.clientX);
		this.mouseFromY = parseInt(mouse.clientY);
		this.applyOffset(diffX,diffY);
	}
	onMouseUp(e){
		this.mouseEvent = false;
	}
	applyOffset(diffX, diffY){
		//Calculate new offsets
		let nOffsetX = this.state.offsetX - diffX;
		let nOffsetY = this.state.offsetY - diffY;

		//Calculate the difference from the displayBox
		let diffDisplayX = (this.state.displayBoxWidth - this.state.displayWidth);
		if (nOffsetX < diffDisplayX){
			nOffsetX = diffDisplayX
		} else if (nOffsetX > 0){
			nOffsetX = 0;
		}

		let diffDisplayY = (this.state.displayBoxHeight - this.state.displayHeight);
		if (nOffsetY < diffDisplayY){
			nOffsetY = diffDisplayY
		} else if (nOffsetY > 0){
			nOffsetY = 0;
		}

		//Calculate the relative values in relation to the image scale
		let relativeOffsetY = (this.state.relativeDisplayedHeight / this.state.displayBoxHeight)*(-nOffsetY);
		let relativeOffsetX = (this.state.relativeDisplayedWidth / this.state.displayBoxWidth)*(-nOffsetX);

		this.setState({
			offsetX: nOffsetX,
			offsetY: nOffsetY,
			relativeOffsetX,
			relativeOffsetY
		});
	}
	render(){
		let displayBoxStyle = Object.assign({
			'width': this.state.displayBoxWidth,
			'height': this.state.displayBoxHeight,
			'backgroundImage': this.state.b64 ? ('url(' + this.state.b64 + ')') : null,
			'backgroundSize': this.state.displayWidth + 'px ' + this.state.displayHeight + 'px',
			'backgroundPosition': this.state.offsetX + 'px ' + this.state.offsetY + 'px'
		}, this.props.style || {});

		return (<div
			className={this.props.className || 'ImageEditor'}
			style={this.props.style}
			onTouchStart={this.onTouchStart}
			onTouchMove={this.onTouchMove}
			onMouseDown={this.onMouseDown}>
			<div style={displayBoxStyle}></div>
		</div>);
	}
}

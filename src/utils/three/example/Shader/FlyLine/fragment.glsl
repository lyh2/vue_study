export default `
    precision lowp float ;
    varying vec4 vPosition;
    varying vec4 vSrcPosition;

    void main(){
        vec4 redColor = vec4(1.,0.,0.,1.);
        vec4 yellowColor = vec4(1.,1.,0.5,1.);
        vec4 mixColor = mix(yellowColor,redColor,vSrcPosition.y / 3.0);

        if(gl_FrontFacing){
            gl_FragColor = vec4(mixColor.xyz - (vPosition.y - 20.0) / 80. - 0.1,1.);
        }else{
            gl_FragColor = vec4(mixColor.xyz,1.);
        }
    }
`;
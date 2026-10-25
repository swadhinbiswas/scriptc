import { AmbientLight, ArrowHelper, AxesHelper, Box3Helper, BoxGeometry, BoxHelper, CameraHelper, Color, DataTexture, DirectionalLight, DirectionalLightHelper, Fog, FogExp2, GridHelper, HemisphereLight, LightProbe, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshLambertMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshToonMaterial, PerspectiveCamera, PointLight, RawShaderMaterial, RectAreaLight, RenderTarget, Scene, ShaderMaterial, SpotLight, Timer, UniformsUtils, Vector3, Vector4, WebGLRenderTarget } from "three";

// lights-fog
{
    const lights = [new AmbientLight(0xff0000, 0.5), new DirectionalLight(), new HemisphereLight(), new PointLight(0xffffff, 2, 10), new SpotLight(), new RectAreaLight(0xffffff, 2, 3, 4), new LightProbe()];
    for (const l of lights)
        console.log(l.type, l.intensity, l.clone().type);
    const point = lights[3];
    console.log('power', point.power.toFixed(4));
    point.power = 4 * Math.PI;
    console.log('intensity', point.intensity);
    const s = new Scene();
    s.fog = new Fog(0xffffff, 1, 10);
    console.log('fog', s.fog.clone().near);
    s.fog = new FogExp2(0xff0000, 0.1);
    console.log('fogexp', s.fog.density);
}

// materials-advanced
{
    for (const m of [new MeshPhysicalMaterial({ clearcoat: 1, transmission: 0.5, ior: 1.5 }), new MeshPhongMaterial({ shininess: 60 }), new MeshLambertMaterial(), new MeshToonMaterial(), new MeshDepthMaterial()])
        console.log(m.type, m.clone().type, m.transparent);
    const uniforms = { amount: { value: 2 }, color: { value: new Color(0xff0000) }, direction: { value: new Vector3(1, 2, 3) } };
    const copy = UniformsUtils.clone(uniforms);
    console.log('uniforms', copy.amount.value, copy.color.value !== uniforms.color.value);
    const shader = new ShaderMaterial({ uniforms, vertexShader: 'void main() {}', fragmentShader: 'void main() {}' });
    console.log('shader', shader.clone().uniforms.amount.value, new RawShaderMaterial().isRawShaderMaterial);
}

// render-target-data
{
    const target = new WebGLRenderTarget(8, 16, { count: 2, depthBuffer: true });
    console.log('target', target.width, target.height, target.textures.length, target.texture.image.width);
    target.setSize(4, 6);
    console.log('size', target.width, target.height, target.viewport.w);
    const copy = target.clone();
    console.log('copy', copy.width, copy.texture !== target.texture);
}

// renderer-resource-lifetime
{
    let n = 0;
    const dispose = () => n++;
    for (const x of [new BoxGeometry(), new MeshBasicMaterial(), new DataTexture(new Uint8Array(4), 1, 1), new WebGLRenderTarget(1, 1)]) {
        x.addEventListener('dispose', dispose);
        x.dispose();
        x.removeEventListener('dispose', dispose);
    }
    console.log('disposed', n);
}

// helpers
{
    const mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    for (const h of [new GridHelper(10, 4), new AxesHelper(2), new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), 2), new BoxHelper(mesh), new CameraHelper(new PerspectiveCamera()), new DirectionalLightHelper(new DirectionalLight())])
        console.log(h.type, h.children.length, h.geometry === undefined ? 'none' : h.geometry.attributes.position.count);
}

// timer-stable
{
    const timer = new Timer();
    timer.update(1000);
    timer.update(1250);
    console.log('delta', timer.getDelta().toFixed(6), timer.getDelta().toFixed(6));
    timer.setTimescale(2);
    timer.update(1500);
    // Match the delta output precision across independently sampled clock origins.
    console.log('scale', timer.getDelta().toFixed(6), timer.getTimescale(), Number.isFinite(timer.getElapsed()));
    timer.dispose();
}

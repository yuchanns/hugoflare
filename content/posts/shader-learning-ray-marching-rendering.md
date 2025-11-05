+++
title = 'Shader Learning Series Part 1: Understanding Ray Marching Rendering'
date = 2025-02-14T15:52:54+08:00
draft = true
+++

> Warning: The following content is generated and summarized by AI. It represents my personal learning journey and thought process. There might be inaccuracies, please use it as a reference with discretion.

<!--more-->

https://github.com/yuchanns/shader_playground/blob/main/sphere_bloom_mouse_light.frag

During my journey learning shader programming, I delved deep into Ray Marching, a fascinating rendering technique. This article summarizes my understanding of this topic.

## Basic Principles of Ray Marching

Ray Marching is an algorithm for rendering 3D scenes and is a variant of ray tracing. Its fundamental concept involves:

1. Emitting rays from the camera (viewpoint)
2. Advancing along the ray direction with variable step sizes
3. Calculating the distance to the nearest object in the scene at each step (known as distance field or SDF)
4. Stopping the march when the distance is below a certain threshold, indicating a "hit"
5. Computing surface normals, lighting, and other properties at the hit point

## Key Concepts

### 1. ro (Ray Origin)

`ro` represents the starting point of the ray, which is the camera position. In our example:

```glsl
vec3 ro = vec3(0.0, 0.0, -3.0);
```

This means the camera is positioned at z=-3, facing the center of the scene.

### 2. rd (Ray Direction)

`rd` represents the ray direction vector. It's calculated using the UV coordinates of each pixel:

```glsl
vec3 rd = normalize(vec3(uv * 2.0 - 1.0, 1.0));
```

This calculation creates a unique ray direction for each pixel. The field of view can be adjusted by modifying this calculation.

### 3. Marching Process

The marching process occurs in a loop:

```glsl
vec3 p = ro + rd * t;
```

Here, `p` is the current point being examined in 3D space, and `t` is the distance traveled from the starting point.

### 4. Distance Field (SDF)

A core concept in ray marching is the Signed Distance Function (SDF). An SDF takes a 3D point as input and returns the distance to the nearest object surface in the scene. This distance is signed: negative inside objects and positive outside.

## Rendering Process

1. For each pixel on the screen, we emit a ray.
2. March along the ray direction step by step, using the SDF to calculate the distance to the nearest object at each step.
3. When the distance falls below a threshold, we consider it a "hit" and stop marching.
4. Calculate surface normals, lighting effects, and other properties at the hit point.
5. Based on the hit point information, compute a color value.
6. This color value becomes the final pixel color displayed on screen.

## Performance Considerations

The performance of ray marching rendering primarily depends on scene complexity and marching precision. Common optimization techniques include:

1. Adaptive Step Size: Dynamically adjust step size based on the distance to the nearest object.
2. Early Ray Termination: Stop marching when accumulated opacity reaches a threshold.
3. Spatial Partitioning: Use data structures like octrees to accelerate spatial queries.
4. Parallel Computing: Leverage GPU's parallel processing capabilities to compute multiple pixels simultaneously.

These techniques can significantly improve rendering efficiency, especially in complex scenes.

## Conclusion

Understanding the ray marching algorithm has deepened my knowledge of shader programming. It's not just a rendering technique but a way of thinking about 3D space and light interaction. In my upcoming studies, I'll continue to explore more shader-related topics, so stay tuned!


# 16-Dependency Direction Audit

## Healthy Dependency Flow (VERIFIED/INFERENCE)
- Most packages depend in the correct direction (core → support)

## Boundary Violations (INFERENCE)
- Some cross-package imports may violate boundaries (TODO: Audit import graph)

## Renderer/Main Leaks (INFERENCE)
- TODO: Audit for main leaking into renderer or vice versa

## Package Dependency Confusion (INFERENCE)
- Some package.json dependencies may be out of sync (TODO: Audit)

## Cycles/Pseudo-Cycles (INFERENCE)
- TODO: Audit for cycles in import graph

## TODO
- Deep audit for dependency direction and cycles

const logger = require('../../core/logger');
/**
 * CODEZ48 3D SCENE PLANNER
 * Generates 10-stage structured 3D scene specifications from 3D intent payloads.
 */

class ScenePlanner {
    createScenePlan(intentObj) {
        const subject = (intentObj.subject || 'model').toLowerCase();

        if (subject.includes('house') || subject.includes('building') || subject.includes('home') || subject.includes('cottage')) {
            return this.planHouseScene(intentObj);
        } else if (subject.includes('car') || subject.includes('vehicle') || subject.includes('auto')) {
            return this.planSportsCarScene(intentObj);
        } else if (subject.includes('robot')) {
            return this.planRobotScene(intentObj);
        } else if (subject.includes('room') || subject.includes('living') || subject.includes('interior') || subject.includes('bedroom')) {
            return this.planLivingRoomScene(intentObj);
        } else {
            return this.planHouseScene(intentObj);
        }
    }

    planHouseScene(intentObj) {
        return {
            projectName: 'blender-modern-house',
            subject: 'Modern House',
            style: intentObj.style || 'realistic',
            stages: [
                '1. INIT_SCENE',
                '2. FOUNDATION_GEOMETRY',
                '3. WALLS_AND_STRUCTURE',
                '4. ROOF_AND_CEILING',
                '5. DOORS_AND_WINDOWS',
                '6. SURROUNDING_LAWN',
                '7. MATERIALS_PBR',
                '8. ENVIRONMENT_LIGHTING',
                '9. CAMERA_FRAMING',
                '10. RENDER_AND_SAVE'
            ],
            objects: [
                { name: 'House_Foundation', type: 'cube', loc: [0, 0, 0.2], scale: [3.5, 2.8, 0.2], material: 'Mat_Concrete' },
                { name: 'House_Walls_Lower', type: 'cube', loc: [0, 0, 1.6], scale: [3.2, 2.5, 1.2], material: 'Mat_HouseWall' },
                { name: 'House_Walls_Upper', type: 'cube', loc: [0, 0, 3.8], scale: [3.0, 2.3, 1.0], material: 'Mat_HouseWall' },
                { name: 'House_Roof_Main', type: 'cube', loc: [0, 0, 5.1], scale: [3.4, 2.6, 0.3], material: 'Mat_RoofTiles' },
                { name: 'Front_Door_Frame', type: 'cube', loc: [0, -2.55, 1.2], scale: [0.5, 0.1, 1.0], material: 'Mat_DarkMetal' },
                { name: 'Front_Door', type: 'cube', loc: [0, -2.53, 1.2], scale: [0.45, 0.05, 0.95], material: 'Mat_WoodDoor' },
                { name: 'Window_Front_Left', type: 'cube', loc: [-1.8, -2.53, 1.5], scale: [0.6, 0.05, 0.6], material: 'Mat_Glass' },
                { name: 'Window_Front_Right', type: 'cube', loc: [1.8, -2.53, 1.5], scale: [0.6, 0.05, 0.6], material: 'Mat_Glass' },
                { name: 'Window_Upper_Left', type: 'cube', loc: [-1.5, -2.33, 3.8], scale: [0.7, 0.05, 0.6], material: 'Mat_Glass' },
                { name: 'Window_Upper_Right', type: 'cube', loc: [1.5, -2.33, 3.8], scale: [0.7, 0.05, 0.6], material: 'Mat_Glass' },
                { name: 'Surrounding_Lawn_Floor', type: 'plane', loc: [0, 0, 0], scale: [12.0, 12.0, 1.0], material: 'Mat_LawnGrass' },
                { name: 'Driveway_Paving', type: 'cube', loc: [0, -6.0, 0.02], scale: [1.2, 3.5, 0.02], material: 'Mat_Concrete' }
            ],
            materials: [
                { name: 'Mat_HouseWall', color: [0.9, 0.92, 0.95, 1.0], roughness: 0.8 },
                { name: 'Mat_Concrete', color: [0.4, 0.42, 0.45, 1.0], roughness: 0.6 },
                { name: 'Mat_RoofTiles', color: [0.2, 0.12, 0.08, 1.0], roughness: 0.5 },
                { name: 'Mat_WoodDoor', color: [0.35, 0.2, 0.1, 1.0], roughness: 0.4 },
                { name: 'Mat_Glass', color: [0.1, 0.2, 0.3, 0.8], roughness: 0.05 },
                { name: 'Mat_DarkMetal', color: [0.1, 0.12, 0.15, 1.0], metallic: 0.9, roughness: 0.2 },
                { name: 'Mat_LawnGrass', color: [0.15, 0.5, 0.15, 1.0], roughness: 0.9 }
            ],
            lighting: {
                sunLight: { type: 'SUN', loc: [-10, -10, 12], energy: 5.0, color: [1.0, 0.95, 0.85] },
                fillLight: { type: 'AREA', loc: [8, -6, 6], energy: 300, color: [0.5, 0.7, 1.0] }
            },
            camera: {
                loc: [-10.0, -12.0, 7.5],
                rot: [1.0, 0, -0.65]
            }
        };
    }

    planSportsCarScene(intentObj) {
        return {
            projectName: 'blender-sports-car',
            subject: 'Detailed Sports Car',
            style: intentObj.style || 'realistic',
            stages: [
                '1. INIT_SCENE',
                '2. CHASSIS_GEOMETRY',
                '3. HOOD_AND_ROOF',
                '4. WINDOWS_AND_GLASS',
                '5. WHEELS_TIRES_RIMS',
                '6. LIGHTING_ELEMENTS',
                '7. MATERIALS_PBR',
                '8. STUDIO_LIGHTING',
                '9. CAMERA_FRAMING',
                '10. RENDER_AND_SAVE'
            ],
            objects: [
                // Chassis & Body
                { name: 'Car_Chassis_Lower', type: 'cube', loc: [0, 0, 0.5], scale: [2.2, 1.0, 0.4], material: 'Mat_CarPaint' },
                { name: 'Car_Front_Hood', type: 'cube', loc: [-1.2, 0, 0.65], scale: [0.9, 0.95, 0.2], material: 'Mat_CarPaint' },
                { name: 'Car_Roof_Cabin', type: 'cube', loc: [0.1, 0, 1.1], scale: [1.1, 0.85, 0.45], material: 'Mat_CarPaint' },

                // Windows & Glass
                { name: 'Car_Windshield_Front', type: 'cube', loc: [-0.8, 0, 1.05], scale: [0.25, 0.8, 0.35], material: 'Mat_TintedGlass' },
                { name: 'Car_Rear_Window', type: 'cube', loc: [1.0, 0, 1.05], scale: [0.25, 0.8, 0.35], material: 'Mat_TintedGlass' },
                { name: 'Car_Window_Left', type: 'cube', loc: [0.1, 0.86, 1.1], scale: [0.9, 0.05, 0.35], material: 'Mat_TintedGlass' },
                { name: 'Car_Window_Right', type: 'cube', loc: [0.1, -0.86, 1.1], scale: [0.9, 0.05, 0.35], material: 'Mat_TintedGlass' },

                // 4 Wheels & Tires
                { name: 'Wheel_Tire_FL', type: 'cylinder', loc: [-1.3, 1.05, 0.35], scale: [0.35, 0.35, 0.18], material: 'Mat_TireRubber' },
                { name: 'Wheel_Tire_FR', type: 'cylinder', loc: [-1.3, -1.05, 0.35], scale: [0.35, 0.35, 0.18], material: 'Mat_TireRubber' },
                { name: 'Wheel_Tire_RL', type: 'cylinder', loc: [1.2, 1.05, 0.35], scale: [0.38, 0.38, 0.2], material: 'Mat_TireRubber' },
                { name: 'Wheel_Tire_RR', type: 'cylinder', loc: [1.2, -1.05, 0.35], scale: [0.38, 0.38, 0.2], material: 'Mat_TireRubber' },

                // 4 Rims
                { name: 'Wheel_Rim_FL', type: 'cylinder', loc: [-1.3, 1.06, 0.35], scale: [0.22, 0.22, 0.19], material: 'Mat_ChromeRim' },
                { name: 'Wheel_Rim_FR', type: 'cylinder', loc: [-1.3, -1.06, 0.35], scale: [0.22, 0.22, 0.19], material: 'Mat_ChromeRim' },
                { name: 'Wheel_Rim_RL', type: 'cylinder', loc: [1.2, 1.06, 0.35], scale: [0.24, 0.24, 0.21], material: 'Mat_ChromeRim' },
                { name: 'Wheel_Rim_RR', type: 'cylinder', loc: [1.2, -1.06, 0.35], scale: [0.24, 0.24, 0.21], material: 'Mat_ChromeRim' },

                // Headlights & Taillights
                { name: 'Headlight_Left', type: 'uv_sphere', loc: [-2.15, 0.6, 0.6], scale: [0.1, 0.18, 0.1], material: 'Mat_HeadlightLED' },
                { name: 'Headlight_Right', type: 'uv_sphere', loc: [-2.15, -0.6, 0.6], scale: [0.1, 0.18, 0.1], material: 'Mat_HeadlightLED' },
                { name: 'Taillight_Left', type: 'cube', loc: [2.15, 0.65, 0.65], scale: [0.05, 0.2, 0.08], material: 'Mat_TaillightLED' },
                { name: 'Taillight_Right', type: 'cube', loc: [2.15, -0.65, 0.65], scale: [0.05, 0.2, 0.08], material: 'Mat_TaillightLED' },

                // Environment Floor
                { name: 'Showroom_Floor', type: 'plane', loc: [0, 0, 0], scale: [8.0, 8.0, 1.0], material: 'Mat_ShowroomFloor' }
            ],
            materials: [
                { name: 'Mat_CarPaint', color: [0.85, 0.05, 0.08, 1.0], metallic: 0.95, roughness: 0.1 },
                { name: 'Mat_TintedGlass', color: [0.1, 0.15, 0.2, 0.8], roughness: 0.05 },
                { name: 'Mat_TireRubber', color: [0.08, 0.08, 0.08, 1.0], roughness: 0.75 },
                { name: 'Mat_ChromeRim', color: [0.92, 0.92, 0.95, 1.0], metallic: 0.98, roughness: 0.1 },
                { name: 'Mat_HeadlightLED', color: [0.9, 0.95, 1.0, 1.0], emission: 8.0 },
                { name: 'Mat_TaillightLED', color: [1.0, 0.0, 0.0, 1.0], emission: 6.0 },
                { name: 'Mat_ShowroomFloor', color: [0.03, 0.04, 0.07, 1.0], roughness: 0.2 }
            ],
            lighting: {
                keyLight: { type: 'AREA', loc: [-4, -5, 5], energy: 600, color: [1.0, 0.95, 0.9] },
                fillLight: { type: 'AREA', loc: [5, -3, 4], energy: 300, color: [0.4, 0.7, 1.0] },
                rimLight: { type: 'SPOT', loc: [0, 5, 5], energy: 500, color: [0.9, 0.4, 1.0] }
            },
            camera: {
                loc: [-5.5, -6.5, 3.2],
                rot: [1.15, 0, -0.7]
            }
        };
    }

    planRobotScene(intentObj) {
        return {
            projectName: 'blender-futuristic-robot',
            subject: 'Futuristic Robot',
            style: intentObj.style || 'low-poly',
            stages: [
                '1. INIT_SCENE',
                '2. PRIMARY_GEOMETRY',
                '3. SECONDARY_GEOMETRY',
                '4. DETAILING',
                '5. MATERIALS',
                '6. LIGHTING',
                '7. CAMERA_FRAMING',
                '8. MULTI_ANGLE_INSPECTION',
                '9. SAVE_PROJECT',
                '10. VERIFY_OUTPUT'
            ],
            objects: [
                { name: 'Robot_Torso', type: 'cube', loc: [0, 0, 1.5], scale: [0.6, 0.4, 0.8], material: 'Mat_BlueMetallic' },
                { name: 'Robot_Head', type: 'cube', loc: [0, 0, 2.7], scale: [0.35, 0.35, 0.35], material: 'Mat_BlueMetallic' },
                { name: 'Robot_Eye_Left', type: 'uv_sphere', loc: [-0.12, -0.36, 2.75], scale: [0.06, 0.06, 0.06], material: 'Mat_GlowCyan' },
                { name: 'Robot_Eye_Right', type: 'uv_sphere', loc: [0.12, -0.36, 2.75], scale: [0.06, 0.06, 0.06], material: 'Mat_GlowCyan' },
                { name: 'Robot_Arm_Left', type: 'cylinder', loc: [-0.8, 0, 1.6], scale: [0.12, 0.12, 0.6], material: 'Mat_DarkMetal' },
                { name: 'Robot_Arm_Right', type: 'cylinder', loc: [0.8, 0, 1.6], scale: [0.12, 0.12, 0.6], material: 'Mat_DarkMetal' },
                { name: 'Robot_Leg_Left', type: 'cylinder', loc: [-0.3, 0, 0.5], scale: [0.14, 0.14, 0.6], material: 'Mat_DarkMetal' },
                { name: 'Robot_Leg_Right', type: 'cylinder', loc: [0.3, 0, 0.5], scale: [0.14, 0.14, 0.6], material: 'Mat_DarkMetal' },
                { name: 'Studio_Pedestal', type: 'cylinder', loc: [0, 0, -0.1], scale: [1.8, 1.8, 0.1], material: 'Mat_Floor' }
            ],
            materials: [
                { name: 'Mat_BlueMetallic', color: [0.1, 0.4, 0.9, 1.0], metallic: 0.9, roughness: 0.2 },
                { name: 'Mat_DarkMetal', color: [0.2, 0.2, 0.25, 1.0], metallic: 0.8, roughness: 0.3 },
                { name: 'Mat_GlowCyan', color: [0.0, 0.9, 1.0, 1.0], emission: 5.0 },
                { name: 'Mat_Floor', color: [0.05, 0.07, 0.12, 1.0], metallic: 0.1, roughness: 0.5 }
            ],
            lighting: {
                keyLight: { type: 'AREA', loc: [3, -4, 4], energy: 500, color: [1.0, 0.95, 0.9] },
                fillLight: { type: 'AREA', loc: [-4, -2, 3], energy: 250, color: [0.4, 0.7, 1.0] },
                rimLight: { type: 'SPOT', loc: [0, 4, 4], energy: 400, color: [0.9, 0.4, 1.0] }
            },
            camera: {
                loc: [0, -6.5, 2.2],
                rot: [1.35, 0, 0]
            }
        };
    }

    planLivingRoomScene(intentObj) {
        return {
            projectName: 'blender-modern-living-room',
            subject: 'Modern Living Room',
            style: intentObj.style || 'realistic',
            stages: [
                '1. INIT_SCENE',
                '2. PRIMARY_GEOMETRY',
                '3. SECONDARY_GEOMETRY',
                '4. DETAILING',
                '5. MATERIALS',
                '6. LIGHTING',
                '7. CAMERA_FRAMING',
                '8. MULTI_ANGLE_INSPECTION',
                '9. SAVE_PROJECT',
                '10. VERIFY_OUTPUT'
            ],
            objects: [
                { name: 'Room_Floor', type: 'plane', loc: [0, 0, 0], scale: [4.0, 4.0, 1.0], material: 'Mat_WoodFloor' },
                { name: 'Wall_Back', type: 'cube', loc: [0, 4, 2.0], scale: [4.0, 0.1, 2.0], material: 'Mat_Wall' },
                { name: 'Wall_Left', type: 'cube', loc: [-4, 0, 2.0], scale: [0.1, 4.0, 2.0], material: 'Mat_Wall' },
                { name: 'Sofa_Base', type: 'cube', loc: [0, 1.5, 0.4], scale: [1.8, 0.8, 0.3], material: 'Mat_SofaFabric' },
                { name: 'Sofa_Backrest', type: 'cube', loc: [0, 2.1, 0.8], scale: [1.8, 0.2, 0.5], material: 'Mat_SofaFabric' },
                { name: 'Coffee_Table', type: 'cube', loc: [0, -0.2, 0.35], scale: [1.0, 0.5, 0.05], material: 'Mat_TableWood' },
                { name: 'Table_Leg_1', type: 'cylinder', loc: [-0.9, -0.6, 0.15], scale: [0.04, 0.04, 0.15], material: 'Mat_DarkMetal' },
                { name: 'Table_Leg_2', type: 'cylinder', loc: [0.9, -0.6, 0.15], scale: [0.04, 0.04, 0.15], material: 'Mat_DarkMetal' },
                { name: 'Window_Frame', type: 'cube', loc: [-3.9, 0, 2.2], scale: [0.05, 1.2, 1.0], material: 'Mat_DarkMetal' }
            ],
            materials: [
                { name: 'Mat_WoodFloor', color: [0.4, 0.25, 0.15, 1.0], roughness: 0.3 },
                { name: 'Mat_Wall', color: [0.85, 0.88, 0.9, 1.0], roughness: 0.8 },
                { name: 'Mat_SofaFabric', color: [0.2, 0.35, 0.5, 1.0], roughness: 0.7 },
                { name: 'Mat_TableWood', color: [0.25, 0.15, 0.08, 1.0], roughness: 0.4 },
                { name: 'Mat_DarkMetal', color: [0.1, 0.1, 0.12, 1.0], metallic: 0.8, roughness: 0.3 }
            ],
            lighting: {
                sunLight: { type: 'SUN', loc: [-8, -4, 8], energy: 4.0, color: [1.0, 0.95, 0.85] },
                roomLamp: { type: 'POINT', loc: [0, 0, 3.2], energy: 150, color: [1.0, 0.85, 0.6] }
            },
            camera: {
                loc: [3.5, -4.5, 2.8],
                rot: [1.1, 0, 0.6]
            }
        };
    }
}

module.exports = new ScenePlanner();

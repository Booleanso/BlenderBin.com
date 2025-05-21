import bpy
import json
import requests
import threading
import time
import traceback
import zlib
import base64
import math
from bpy.props import StringProperty, BoolProperty, IntProperty, BoolVectorProperty, FloatVectorProperty
from bpy.types import Operator, Panel

bl_info = {
    "name": "Gizmo",
    "author": "BlenderBin.com",
    "version": (1, 0, 0),
    "blender": (2, 80, 0),
    "location": "3D View > Sidebar > Gizmo",
    "description": "AI-powered Blender Python code generation",
    "warning": "",
    "doc_url": "https://blenderbin.com/docs",
    "category": "Interface",
}

# Configuration
API_URL = "http://localhost:3000/api/ai-server"  # Local development server
# API_URL = "https://blenderbin.com/api/ai-server"  # Production server
CHAT_HISTORY = []  # Store chat history for context

class GizmoAIClient:
    def __init__(self, api_url=API_URL):
        self.api_url = api_url
        self.session = requests.Session()
        self.chat_history = []
        self.last_executed_code = ""  # Track the last code we executed to prevent duplicates
        self.is_executing = False     # Flag to prevent multiple simultaneous executions
        
    def send_prompt(self, prompt, callback=None):
        """Send a prompt to the AI server and get a response"""
        # Always run in background thread
        thread = threading.Thread(target=self._send_prompt_thread, args=(prompt, callback))
        thread.daemon = True
        thread.start()
        return {"content": "Processing request...", "type": "pending"}
            
    def _send_prompt_thread(self, prompt, callback=None):
        """Send a prompt to the AI server in a separate thread"""
        try:
            # Add user prompt to history
            self.chat_history.append({"role": "user", "content": prompt})
            
            # Get detailed scene information
            scene_info = self.get_scene_info()
            
            # Get the selected model from Blender's scene
            selected_model = "claude-3-5-sonnet-20240620"  # Default model
            try:
                if hasattr(bpy.context.scene, "gizmo_selected_model"):
                    selected_model = bpy.context.scene.gizmo_selected_model
            except Exception as e:
                print(f"Error getting selected model: {e}")
            
            # Prepare the request
            payload = {
                "prompt": prompt,
                "history": self.chat_history[-10:] if len(self.chat_history) > 1 else [],
                "scene_info": scene_info,
                "model": selected_model
            }
            
            # Compress the payload
            compressed_payload = self._compress_payload(payload)
            
            # Send the request
            print(f"Sending request to {self.api_url}")
            print(f"Payload size: original={len(json.dumps(payload))} bytes, compressed={len(compressed_payload['data'])} bytes")
            
            response = self.session.post(
                self.api_url, 
                json=compressed_payload, 
                timeout=90,  # Increased timeout for larger payloads
                headers={"Content-Type": "application/json", "X-Compressed": "zlib"}
            )
            
            # Check if we got a successful response
            if response.status_code == 200:
                # Check if response is compressed
                if response.headers.get('X-Compressed') == 'zlib':
                    data = self._decompress_payload(response.json())
                else:
                    data = response.json()
                
                # Add AI response to history
                if "content" in data:
                    self.chat_history.append({"role": "assistant", "content": data["content"]})
                
                # Execute code if the response type is 'code'
                if data.get("type") == "code":
                    # IMPORTANT: Don't execute code in a thread - Blender's Python API isn't fully thread-safe
                    # Instead, schedule execution on the main thread using timers
                    code_content = data.get("content", "")
                    
                    # Create a one-time execution function that won't repeat
                    def execute_once():
                        self.execute_code(code_content)
                        return None  # Returning None or False prevents the timer from repeating
                    
                    # Register as a one-shot timer
                    bpy.app.timers.register(execute_once, first_interval=0.1)
                
                result = data
            else:
                error_message = f"Error: Server returned status code {response.status_code}"
                print(error_message)
                result = {"content": error_message, "type": "error"}
                
        except Exception as e:
            error_message = f"Error sending prompt: {str(e)}"
            print(error_message)
            traceback.print_exc()
            result = {"content": error_message, "type": "error"}
        
        # Call the callback with the result if provided
        if callback:
            try:
                # Use bpy.app.timers to run callback in the main thread
                bpy.app.timers.register(lambda: callback(result), first_interval=0.1)
            except Exception as e:
                print(f"Error calling callback: {str(e)}")
        
        return result
    
    def execute_code(self, code):
        """Execute the generated Python code in Blender"""
        # Prevent duplicate execution
        if code.strip() == self.last_executed_code.strip():
            print("Skipping duplicate code execution")
            return True
            
        # Prevent executing while another execution is in progress
        if self.is_executing:
            print("Execution already in progress, skipping")
            return False
            
        self.is_executing = True
        self.last_executed_code = code.strip()
        
        try:
            # Get the current state before execution
            scene_before = self.get_scene_info()
            
            # Execute the code
            print("Executing code:")
            print(code)
            
            # Split code into individual lines for better execution control
            lines = code.split('\n')
            
            # Add a global variable for the execution context
            globals_dict = globals().copy()
            globals_dict['__file__'] = 'gizmo_ai_script'
            
            # Add safety checks for common issues
            safety_prelude = """
# Safety checks for common Blender API issues
def safe_get_active_object():
    try:
        if hasattr(bpy, 'context') and hasattr(bpy.context, 'active_object') and bpy.context.active_object:
            return bpy.context.active_object
        else:
            print("Warning: No active object found")
            return None
    except Exception as e:
        print(f"Error accessing active object: {e}")
        return None

# Ensure we're in object mode for safety
if hasattr(bpy, 'ops'):
    try:
        if bpy.context.object and bpy.context.object.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
    except Exception as e:
        print(f"Warning: Could not set object mode: {e}")
"""

            # For safety, wrap the code in a try-except block with safety prelude
            wrapped_code = (
                safety_prelude +
                "\ntry:\n" +
                "\n".join(f"    {line}" for line in lines) +
                "\nexcept Exception as e:\n" +
                "    import traceback\n" +
                "    traceback.print_exc()\n" +
                "    print(f'Error executing code: {e}')\n"
            )
            
            # Execute the wrapped code
            exec(wrapped_code, globals_dict)
            
            # Get the state after execution
            scene_after = self.get_scene_info()
            
            # Detect changes
            changes = self.detect_changes(scene_before, scene_after)
            
            # Send feedback about execution
            self.send_execution_result(code, changes, scene_after)
            
            # Reset execution flag
            self.is_executing = False
            return True
        except Exception as e:
            error_message = f"Error executing code: {str(e)}"
            print(error_message)
            traceback.print_exc()
            
            # Send error information back to the server
            self.send_execution_error(code, str(e))
            
            # Reset execution flag even on error
            self.is_executing = False
            return False
    
    def get_scene_info(self):
        """Get comprehensive information about the current scene"""
        try:
            # Safely check if context and scene are available
            if not hasattr(bpy, "context") or not hasattr(bpy.context, "scene"):
                return {
                    "error": "Blender context or scene not available",
                    "blender_version": ".".join(map(str, bpy.app.version))
                }
                
            scene = bpy.context.scene
            scene_objects = getattr(scene, "objects", [])
            
            scene_info = {
                "scene_name": scene.name,
                "total_objects": len(scene_objects),
                "object_types": {},
                "active_object_details": None,
                "collections": self._get_collections_data(),
                "objects": [],
                "materials": self._get_materials_data(),
                "render_settings": self._get_render_settings(),
                "blender_version": ".".join(map(str, bpy.app.version))
            }
            
            # Count object types
            for obj in scene_objects:
                try:
                    if obj.type in scene_info["object_types"]:
                        scene_info["object_types"][obj.type] += 1
                    else:
                        scene_info["object_types"][obj.type] = 1
                except Exception as e:
                    print(f"Error processing object type: {e}")
                    
            # Get detailed data for all objects
            for obj in scene_objects:
                try:
                    obj_data = self._get_object_data(obj)
                    scene_info["objects"].append(obj_data)
                except Exception as e:
                    print(f"Error getting data for object {obj.name if hasattr(obj, 'name') else 'unknown'}: {e}")
                    scene_info["objects"].append({"name": obj.name if hasattr(obj, 'name') else "unknown", "error": str(e)})
        except Exception as e:
            print(f"Error collecting scene info: {e}")
            return {
                "error": f"Failed to collect scene info: {str(e)}",
                "blender_version": ".".join(map(str, bpy.app.version)) if hasattr(bpy, "app") else "Unknown"
            }
        
        # Get active object details - with safe access
        try:
            # Check if context is available and has an active object
            if hasattr(bpy, "context") and hasattr(bpy.context, "active_object") and bpy.context.active_object:
                active = bpy.context.active_object
                scene_info["active_object_details"] = {
                    "name": active.name,
                    "type": active.type,
                    "location": [round(v, 4) for v in active.location],
                    "rotation": [round(v, 4) for v in active.rotation_euler],
                    "scale": [round(v, 4) for v in active.scale],
                    "dimensions": [round(v, 4) for v in active.dimensions],
                    "selected": active.select_get(),
                    "parent": active.parent.name if active.parent else None,
                    "visible": active.visible_get()
                }
                
                # Get selected vertices for mesh objects
                if active.type == 'MESH' and active.mode == 'EDIT':
                    scene_info["active_object_details"]["selected_elements"] = self._get_selected_elements(active)
            else:
                scene_info["active_object_details"] = None
        except Exception as e:
            print(f"Error getting active object details: {e}")
            scene_info["active_object_details"] = None
            scene_info["active_object_error"] = str(e)
        
        return scene_info
        
    def _get_object_data(self, obj):
        """Get detailed data for a single object"""
        obj_data = {
            "name": obj.name,
            "type": obj.type,
            "location": [round(v, 4) for v in obj.location],
            "rotation": [round(v, 4) for v in obj.rotation_euler],
            "scale": [round(v, 4) for v in obj.scale],
            "dimensions": [round(v, 4) for v in obj.dimensions],
            "parent": obj.parent.name if obj.parent else None,
            "collections": [coll.name for coll in obj.users_collection],
            "visible": obj.visible_get(),
            "selected": obj.select_get(),
            "modifiers": self._get_modifiers_data(obj),
            "constraints": self._get_constraints_data(obj),
            "materials": self._get_object_materials(obj)
        }
        
        # Add type-specific data
        if obj.type == 'MESH':
            obj_data["mesh"] = {
                "vertices": len(obj.data.vertices),
                "edges": len(obj.data.edges),
                "polygons": len(obj.data.polygons),
                "has_custom_normals": obj.data.has_custom_normals,
                "has_uv_layers": len(obj.data.uv_layers) > 0,
                "uv_layers": [uv.name for uv in obj.data.uv_layers]
            }
        elif obj.type == 'CURVE':
            obj_data["curve"] = {
                "splines": len(obj.data.splines),
                "dimensions": obj.data.dimensions,
                "resolution_u": obj.data.resolution_u
            }
        elif obj.type == 'LIGHT':
            obj_data["light"] = {
                "type": obj.data.type,
                "color": [round(v, 4) for v in obj.data.color],
                "energy": obj.data.energy
            }
        elif obj.type == 'CAMERA':
            obj_data["camera"] = {
                "lens": obj.data.lens,
                "sensor_width": obj.data.sensor_width,
                "is_perspective": not obj.data.type == 'ORTHO'
            }
        elif obj.type == 'ARMATURE':
            obj_data["armature"] = {
                "bones": len(obj.data.bones),
                "bone_names": [bone.name for bone in obj.data.bones]
            }
            
        return obj_data
        
    def _get_collections_data(self):
        """Get data about all collections in the scene"""
        try:
            if not hasattr(bpy, "data") or not hasattr(bpy.data, "collections"):
                return [{"error": "Collections data not available"}]
                
            collections = []
            
            for coll in bpy.data.collections:
                try:
                    coll_data = {
                        "name": coll.name,
                        "objects": [obj.name for obj in coll.objects],
                        "children": [child.name for child in coll.children],
                        "hide_viewport": coll.hide_viewport,
                        "hide_render": coll.hide_render
                    }
                    collections.append(coll_data)
                except Exception as e:
                    print(f"Error processing collection {coll.name if hasattr(coll, 'name') else 'unknown'}: {e}")
                    collections.append({
                        "name": coll.name if hasattr(coll, 'name') else "unknown",
                        "error": str(e)
                    })
                
            return collections
        except Exception as e:
            print(f"Error getting collections data: {e}")
            return [{"error": str(e)}]
        
    def _get_modifiers_data(self, obj):
        """Get data about object modifiers"""
        modifiers = []
        
        for mod in obj.modifiers:
            mod_data = {
                "name": mod.name,
                "type": mod.type,
                "show_viewport": mod.show_viewport,
                "show_render": mod.show_render
            }
            
            # Add type-specific attributes
            if mod.type == 'SUBSURF':
                mod_data["levels"] = mod.levels
                mod_data["render_levels"] = mod.render_levels
            elif mod.type == 'ARRAY':
                mod_data["count"] = mod.count
                mod_data["use_relative_offset"] = mod.use_relative_offset
            elif mod.type == 'MIRROR':
                mod_data["use_axis"] = [mod.use_axis[0], mod.use_axis[1], mod.use_axis[2]]
                
            modifiers.append(mod_data)
            
        return modifiers
        
    def _get_constraints_data(self, obj):
        """Get data about object constraints"""
        constraints = []
        
        for con in obj.constraints:
            con_data = {
                "name": con.name,
                "type": con.type,
                "influence": con.influence,
                "mute": con.mute
            }
            
            # Add type-specific attributes
            if con.type == 'COPY_LOCATION':
                con_data["target"] = con.target.name if con.target else None
            elif con.type == 'TRACK_TO':
                con_data["target"] = con.target.name if con.target else None
                
            constraints.append(con_data)
            
        return constraints
        
    def _get_materials_data(self):
        """Get data about all materials in the scene"""
        try:
            if not hasattr(bpy, "data") or not hasattr(bpy.data, "materials"):
                return [{"error": "Materials data not available"}]
                
            materials = []
            
            for mat in bpy.data.materials:
                try:
                    mat_data = {
                        "name": mat.name,
                        "use_nodes": mat.use_nodes,
                        "users": mat.users,
                        "is_grease_pencil": mat.is_grease_pencil
                    }
                    
                    # Basic shader info
                    if mat.use_nodes and not mat.is_grease_pencil:
                        if hasattr(mat, "node_tree") and hasattr(mat.node_tree, "nodes") and 'Principled BSDF' in mat.node_tree.nodes:
                            try:
                                bsdf = mat.node_tree.nodes['Principled BSDF']
                                mat_data["base_color"] = [round(v, 4) for v in bsdf.inputs["Base Color"].default_value]
                                mat_data["metallic"] = round(bsdf.inputs["Metallic"].default_value, 4)
                                mat_data["roughness"] = round(bsdf.inputs["Roughness"].default_value, 4)
                            except Exception as e:
                                print(f"Error getting BSDF properties for material {mat.name}: {e}")
                                mat_data["shader_error"] = str(e)
                        
                    materials.append(mat_data)
                except Exception as e:
                    print(f"Error processing material {mat.name if hasattr(mat, 'name') else 'unknown'}: {e}")
                    materials.append({
                        "name": mat.name if hasattr(mat, 'name') else "unknown",
                        "error": str(e)
                    })
                
            return materials
        except Exception as e:
            print(f"Error getting materials data: {e}")
            return [{"error": str(e)}]
        
    def _get_object_materials(self, obj):
        """Get materials assigned to an object"""
        materials = []
        
        for slot in obj.material_slots:
            if slot.material:
                materials.append(slot.material.name)
                
        return materials
        
    def _get_render_settings(self):
        """Get current render settings"""
        try:
            if not hasattr(bpy, "context") or not hasattr(bpy.context, "scene") or not hasattr(bpy.context.scene, "render"):
                return {"error": "Render settings not available"}
                
            render = bpy.context.scene.render
            return {
                "engine": render.engine,
                "resolution_x": render.resolution_x,
                "resolution_y": render.resolution_y,
                "resolution_percentage": render.resolution_percentage,
                "fps": round(render.fps / render.fps_base, 2),
                "film_transparent": render.film_transparent
            }
        except Exception as e:
            print(f"Error getting render settings: {e}")
            return {"error": str(e)}
        
    def _get_selected_elements(self, obj):
        """Get information about selected vertices/edges/faces in edit mode"""
        try:
            # This requires bmesh which is safe to import in Blender
            import bmesh
            
            selected = {
                "vertices": 0,
                "edges": 0,
                "faces": 0
            }
            
            if obj.mode == 'EDIT' and obj.type == 'MESH':
                bm = bmesh.from_edit_mesh(obj.data)
                selected["vertices"] = sum(1 for v in bm.verts if v.select)
                selected["edges"] = sum(1 for e in bm.edges if e.select)
                selected["faces"] = sum(1 for f in bm.faces if f.select)
                
            return selected
        except Exception as e:
            print(f"Error getting selected elements: {e}")
            return {"error": str(e)}
    
    def detect_changes(self, before, after):
        """Detect changes in the scene after code execution"""
        try:
            if not hasattr(bpy, "context") or not hasattr(bpy.context, "scene"):
                return {
                    "error": "Could not detect changes: Scene not available",
                    "added_objects": [],
                    "removed_objects": [],
                    "modified_objects": []
                }
            
            # Get current object names
            try:
                current_objects = set(obj.name for obj in bpy.context.scene.objects)
            except Exception as e:
                print(f"Error accessing scene objects: {e}")
                current_objects = set()
            
            # Use the passed before/after data for comparison if available
            before_objects = set()
            after_objects = set()
            
            # Extract object names from before data
            if isinstance(before, dict) and "objects" in before:
                before_objects = set(obj.get("name", "") for obj in before["objects"] if isinstance(obj, dict) and "name" in obj)
            else:
                before_objects = current_objects
                
            # Extract object names from after data
            if isinstance(after, dict) and "objects" in after:
                after_objects = set(obj.get("name", "") for obj in after["objects"] if isinstance(obj, dict) and "name" in obj)
            else:
                after_objects = current_objects
            
            # Calculate differences
            added_objects = list(after_objects - before_objects)
            removed_objects = list(before_objects - after_objects)
            
            # Check for modified objects (simple heuristic)
            modified_objects = []
            for obj_name in before_objects.intersection(after_objects):
                # You could add more sophisticated change detection here
                pass
            
            changes = {
                "added_objects": added_objects,
                "removed_objects": removed_objects,
                "modified_objects": modified_objects,
                "summary": f"Added {len(added_objects)} objects, removed {len(removed_objects)} objects"
            }
            
            return changes
        except Exception as e:
            print(f"Error detecting changes: {e}")
            return {
                "error": f"Error detecting changes: {str(e)}",
                "added_objects": [],
                "removed_objects": [],
                "modified_objects": []
            }
    
    def send_execution_result(self, code, changes, scene_info):
        """Send execution result feedback to the server"""
        try:
            payload = {
                "type": "execution_result",
                "content": {
                    "code": code,
                    "changes": changes,
                    "scene_info": scene_info
                }
            }
            
            # Send the request asynchronously in a new thread
            thread = threading.Thread(target=self._send_feedback, args=(payload,))
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            print(f"Error sending execution result: {e}")
    
    def send_execution_error(self, code, error):
        """Send execution error feedback to the server"""
        try:
            payload = {
                "type": "execution_error",
                "content": {
                    "code": code,
                    "error": error,
                    "chat_history": self.chat_history[-5:] if len(self.chat_history) >= 5 else self.chat_history,
                    "current_scene_info": self.get_scene_info()
                }
            }
            
            # Send the request asynchronously in a new thread
            thread = threading.Thread(target=self._send_feedback, args=(payload,))
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            print(f"Error sending execution error: {e}")
    
    def send_user_feedback(self, code, success, feedback):
        """Send user feedback about executed code"""
        try:
            payload = {
                "type": "user_feedback",
                "content": {
                    "code": code,
                    "success": success,
                    "feedback": feedback,
                    "chat_history": self.chat_history[-5:] if len(self.chat_history) >= 5 else self.chat_history,
                    "current_scene_info": self.get_scene_info()
                }
            }
            
            # Send the request asynchronously in a new thread
            thread = threading.Thread(target=self._send_feedback, args=(payload,))
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            print(f"Error sending user feedback: {e}")
    
    def _send_feedback(self, payload):
        """Send feedback to the server in a separate thread"""
        try:
            # Compress the payload
            compressed_payload = self._compress_payload(payload)
            
            # Include current scene info with feedback
            if isinstance(payload, dict) and "content" in payload and isinstance(payload["content"], dict):
                # Add scene info to the payload content
                payload["content"]["scene_info"] = self.get_scene_info()
                # Compress again with the scene info
                compressed_payload = self._compress_payload(payload)
            
            # Send the compressed payload
            response = self.session.post(
                self.api_url, 
                json=compressed_payload, 
                timeout=30,
                headers={"Content-Type": "application/json", "X-Compressed": "zlib"}
            )
            
            orig_size = len(json.dumps(payload)) if isinstance(payload, dict) else len(str(payload))
            comp_size = len(compressed_payload["data"]) if "data" in compressed_payload else 0
            
            print(f"Feedback sent, response: {response.status_code}")
            print(f"Feedback size: original={orig_size} bytes, compressed={comp_size} bytes")
            
            if response.status_code != 200:
                print(f"Error sending feedback: Server returned status code {response.status_code}")
                
        except Exception as e:
            print(f"Error sending feedback: {e}")
    
    def clear_memory(self):
        """Clear the chat history"""
        self.chat_history = []
        
        # Tell the server to clear its memory in a background thread
        thread = threading.Thread(target=self._clear_memory_thread)
        thread.daemon = True
        thread.start()
        
    def _clear_memory_thread(self):
        """Clear server memory in a separate thread"""
        try:
            payload = {"type": "clear_memory"}
            response = self.session.post(self.api_url, json=payload, timeout=10)
            print(f"Memory cleared, response: {response.status_code}")
        except Exception as e:
            print(f"Error clearing memory: {e}")
    
    def _compress_payload(self, payload):
        """Compress the payload using zlib compression"""
        try:
            # Convert payload to JSON string
            json_data = json.dumps(payload)
            
            # Compress the JSON string
            compressed_data = zlib.compress(json_data.encode('utf-8'))
            
            # Convert to base64 string for safe transmission
            b64_data = base64.b64encode(compressed_data).decode('ascii')
            
            # Return compressed payload
            return {
                "compressed": True,
                "format": "zlib+base64",
                "data": b64_data
            }
        except Exception as e:
            print(f"Error compressing payload: {e}")
            # Return original payload if compression fails
            return payload
    
    def _decompress_payload(self, compressed_payload):
        """Decompress a zlib compressed payload"""
        try:
            if not isinstance(compressed_payload, dict):
                return compressed_payload
                
            if not compressed_payload.get("compressed"):
                return compressed_payload
                
            # Get the compressed data
            b64_data = compressed_payload.get("data", "")
            
            # Decode base64
            compressed_data = base64.b64decode(b64_data)
            
            # Decompress the data
            json_data = zlib.decompress(compressed_data).decode('utf-8')
            
            # Parse the JSON data
            return json.loads(json_data)
        except Exception as e:
            print(f"Error decompressing payload: {e}")
            # Return original payload if decompression fails
            return compressed_payload


# Global client instance
ai_client = GizmoAIClient()

# Process input from the text field
class GIZMO_OT_process_input(Operator):
    bl_idname = "gizmo.process_input"
    bl_label = "Process Input"
    bl_description = "Process the input and send to AI"
    
    def execute(self, context):
        prompt = context.scene.gizmo_input
        if not prompt.strip():
            self.report({'ERROR'}, "Please enter a prompt")
            return {'CANCELLED'}
        
        # Display processing message
        context.scene.gizmo_ai_result = "Processing request..."
        context.scene.gizmo_ai_type = "pending"
        
        # Save prompt to chat history
        CHAT_HISTORY.append({"prompt": prompt, "response": ""})
        
        # Clear the input field
        context.scene.gizmo_input = ""
        
        # Send the prompt to the AI with a callback to update UI
        global ai_client
        ai_client.send_prompt(prompt, callback=self.update_ui_callback)
        
        return {'FINISHED'}
    
    def update_ui_callback(self, response):
        """Callback to update the UI when the response is received"""
        try:
            # Update scene properties
            bpy.context.scene.gizmo_ai_result = response.get("content", "")
            bpy.context.scene.gizmo_ai_type = response.get("type", "text")
            
            # Update the last chat history entry with the response
            if CHAT_HISTORY and "response" in CHAT_HISTORY[-1]:
                CHAT_HISTORY[-1]["response"] = response.get("content", "")
            
            # Force a UI redraw
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    area.tag_redraw()
            
            return None  # Required for timer callbacks
        except Exception as e:
            print(f"Error updating UI: {str(e)}")
            traceback.print_exc()
            return None


# Panel for displaying the AI interface
class GIZMO_PT_ai_panel(Panel):
    bl_label = "Gizmo"
    bl_idname = "GIZMO_PT_ai_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Gizmo'
    
    def draw(self, context):
        layout = self.layout
        scene = context.scene
        
        # Model selection dropdown
        box = layout.box()
        box.label(text="Model Selection:")
        box.prop(scene, "gizmo_selected_model", text="")
        
        # Direct input field and submission
        layout.label(text="Ask Gizmo:")
        row = layout.row(align=True)
        row.prop(scene, "gizmo_input", text="")
        row.operator("gizmo.process_input", text="", icon='PLAY')
        
        # Clear history button
        layout.operator("gizmo.clear_history", text="Clear History", icon='TRASH')
        
        # Result box
        if hasattr(scene, "gizmo_ai_result") and scene.gizmo_ai_result:
            box = layout.box()
            box.label(text="AI Response:")
            
            if hasattr(scene, "gizmo_ai_type"):
                if scene.gizmo_ai_type == "pending":
                    # Show loading indicator
                    box.label(text="Processing request...", icon='SORTTIME')
                elif scene.gizmo_ai_type == "code":
                    box.label(text="Code generated:")
                    box.operator("gizmo.execute_code", text="Run Code")
                else:
                    text = scene.gizmo_ai_result
                    # Split long text into multiple lines
                    if len(text) > 40:
                        lines = [text[i:i+40] for i in range(0, len(text), 40)]
                        for line in lines[:5]:  # Show only first 5 lines
                            box.label(text=line)
                        if len(lines) > 5:
                            box.label(text="...")
                    else:
                        box.label(text=text)


# Operator for executing code
class GIZMO_OT_execute_code(Operator):
    bl_idname = "gizmo.execute_code"
    bl_label = "Execute Code"
    bl_description = "Execute the generated code"
    
    def execute(self, context):
        if not hasattr(context.scene, "gizmo_ai_result") or not context.scene.gizmo_ai_result:
            self.report({'ERROR'}, "No code to execute")
            return {'CANCELLED'}
        
        # Get the code from the scene
        code_to_execute = context.scene.gizmo_ai_result
        
        # Create a one-time execution function that won't repeat
        def execute_once():
            global ai_client
            success = ai_client.execute_code(code_to_execute)
            
            if success:
                self.report({'INFO'}, "Code executed successfully")
            else:
                self.report({'ERROR'}, "Error executing code")
                
            return None  # Ensures timer won't repeat
        
        # Schedule execution on the main thread
        bpy.app.timers.register(execute_once, first_interval=0.1)
        
        return {'FINISHED'}


# Operator for clearing chat history
class GIZMO_OT_clear_history(Operator):
    bl_idname = "gizmo.clear_history"
    bl_label = "Clear History"
    bl_description = "Clear chat history"
    
    def execute(self, context):
        global CHAT_HISTORY, ai_client
        CHAT_HISTORY.clear()
        ai_client.clear_memory()
        
        # Clear UI fields
        context.scene.gizmo_ai_result = ""
        context.scene.gizmo_ai_type = ""
        
        self.report({'INFO'}, "Chat history cleared")
        return {'FINISHED'}


# Custom input field operator with Enter key handling
class GIZMO_OT_input_field(Operator):
    bl_idname = "gizmo.input_field"
    bl_label = "Input Field"
    bl_description = "Input field with Enter key handling"
    
    input_text: StringProperty(
        name="Input",
        description="Enter your prompt here"
    )
    
    def execute(self, context):
        context.scene.gizmo_input = self.input_text
        bpy.ops.gizmo.process_input()
        return {'FINISHED'}
    
    def invoke(self, context, event):
        self.input_text = context.scene.gizmo_input
        return context.window_manager.invoke_props_dialog(self, width=400)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "input_text", text="")


def register():
    # Model choices for the dropdown
    model_items = [
        ('claude-3-5-sonnet-20240620', 'Claude 3.5 Sonnet', 'Claude 3.5 Sonnet model'),
        ('claude-3-opus-20240229', 'Claude 3 Opus', 'Claude 3 Opus model - most powerful'),
        ('claude-3-sonnet-20240229', 'Claude 3 Sonnet', 'Claude 3 Sonnet model - balanced'),
        ('claude-3-haiku-20240307', 'Claude 3 Haiku', 'Claude 3 Haiku model - fastest'),
        ('gpt-4o', 'GPT-4o', 'OpenAI GPT-4o model'),
        ('gpt-4-turbo', 'GPT-4 Turbo', 'OpenAI GPT-4 Turbo model'),
        ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'OpenAI GPT-3.5 Turbo model - fastest'),
        ('gemini-pro', 'Gemini Pro', 'Google Gemini Pro model')
    ]
    
    bpy.types.Scene.gizmo_selected_model = bpy.props.EnumProperty(
        name="AI Model",
        description="Select the AI model to use",
        items=model_items,
        default='claude-3-5-sonnet-20240620'
    )
    
    bpy.types.Scene.gizmo_input = StringProperty(
        name="Input",
        description="Enter your prompt here"
    )
    bpy.types.Scene.gizmo_ai_result = StringProperty(default="")
    bpy.types.Scene.gizmo_ai_type = StringProperty(default="")
    
    bpy.utils.register_class(GIZMO_OT_process_input)
    bpy.utils.register_class(GIZMO_OT_execute_code)
    bpy.utils.register_class(GIZMO_OT_clear_history)
    bpy.utils.register_class(GIZMO_OT_input_field)
    bpy.utils.register_class(GIZMO_PT_ai_panel)


def unregister():
    bpy.utils.unregister_class(GIZMO_PT_ai_panel)
    bpy.utils.unregister_class(GIZMO_OT_execute_code)
    bpy.utils.unregister_class(GIZMO_OT_clear_history)
    bpy.utils.unregister_class(GIZMO_OT_input_field)
    bpy.utils.unregister_class(GIZMO_OT_process_input)
    
    del bpy.types.Scene.gizmo_input
    del bpy.types.Scene.gizmo_ai_result
    del bpy.types.Scene.gizmo_ai_type
    del bpy.types.Scene.gizmo_selected_model


if __name__ == "__main__":
    register() 
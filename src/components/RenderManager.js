// RenderManager.js
// A utility to properly manage PDF rendering operations and prevent concurrent render calls

class RenderManager {
    constructor() {
      this.pendingRenderTasks = new Map();
      this.activeRenderTask = null;
      this.renderLock = false;
    }
  
    /**
     * Queue a render task and execute it when previous tasks are complete
     * @param {string} canvasId - Unique identifier for the canvas
     * @param {Function} renderFunction - Async function that performs the actual rendering
     * @returns {Promise} - Promise that resolves when rendering is complete
     */
    async queueRender(canvasId, renderFunction) {
      console.log(`RenderManager: Queueing render task for canvas ${canvasId}`);
      
      // Cancel any pending render for this canvas
      if (this.pendingRenderTasks.has(canvasId)) {
        const pendingTask = this.pendingRenderTasks.get(canvasId);
        console.log(`RenderManager: Cancelling pending task for canvas ${canvasId}`);
        pendingTask.cancelled = true;
        this.pendingRenderTasks.delete(canvasId);
      }
      
      // If we have an active render task, cancel it to be safe
      if (this.activeRenderTask && this.renderLock) {
        console.log(`RenderManager: Waiting for render lock to be released`);
        // Wait a moment to ensure any in-progress renders can complete or cancel
        await new Promise(resolve => setTimeout(resolve, 100));
      }
  
      // Create a new task with cancellation tracking
      const task = {
        id: canvasId,
        renderFunction,
        cancelled: false,
        promise: null,
        resolve: null,
        reject: null
      };
  
      // Create a promise that will be resolved when this task completes
      task.promise = new Promise((resolve, reject) => {
        task.resolve = resolve;
        task.reject = reject;
        
        const executeTask = async () => {
          // Set the render lock
          this.renderLock = true;
          console.log(`RenderManager: Executing render task for canvas ${canvasId}`);
          
          // If task was cancelled while waiting, don't execute
          if (task.cancelled) {
            console.log(`RenderManager: Task for canvas ${canvasId} was cancelled before execution`);
            this.renderLock = false;
            resolve({ cancelled: true });
            return;
          }
  
          try {
            this.activeRenderTask = task;
            const result = await renderFunction();
            resolve(result);
          } catch (error) {
            console.error(`RenderManager: Error in render task for canvas ${canvasId}:`, error);
            // Only reject if task wasn't cancelled
            if (!task.cancelled) {
              reject(error);
            } else {
              resolve({ cancelled: true });
            }
          } finally {
            console.log(`RenderManager: Task for canvas ${canvasId} completed`);
            // Task is complete, remove from active
            if (this.activeRenderTask === task) {
              this.activeRenderTask = null;
            }
            
            // Release the render lock
            this.renderLock = false;
            
            // If there are more tasks in the queue, process the next one
            this.processNextTask();
          }
        };
  
        // If no active task, execute immediately, otherwise queue
        if (!this.activeRenderTask && !this.renderLock) {
          executeTask();
        } else {
          console.log(`RenderManager: Task for canvas ${canvasId} queued for later execution`);
          this.pendingRenderTasks.set(canvasId, task);
        }
      });
  
      return task.promise;
    }
  
    /**
     * Process the next task in the queue
     */
    processNextTask() {
      if (this.pendingRenderTasks.size === 0 || this.activeRenderTask) {
        return;
      }
  
      // Get the first task in the queue
      const [canvasId, nextTask] = this.pendingRenderTasks.entries().next().value;
      this.pendingRenderTasks.delete(canvasId);
  
      if (!nextTask.cancelled) {
        nextTask.renderFunction()
          .then(result => {
            // Resolve the task's promise
            nextTask.resolve?.(result);
          })
          .catch(error => {
            if (!nextTask.cancelled) {
              nextTask.reject?.(error);
            }
          })
          .finally(() => {
            this.activeRenderTask = null;
            this.processNextTask();
          });
      }
    }
  
    /**
     * Cancel all pending render tasks
     */
    cancelAll() {
      // Mark all pending tasks as cancelled
      for (const task of this.pendingRenderTasks.values()) {
        task.cancelled = true;
      }
      
      // Clear the queue
      this.pendingRenderTasks.clear();
      
      // Mark active task as cancelled if there is one
      if (this.activeRenderTask) {
        this.activeRenderTask.cancelled = true;
      }
    }
  
    /**
     * Cancel a specific render task by canvas ID
     * @param {string} canvasId - The ID of the canvas to cancel renders for
     */
    cancelRender(canvasId) {
      if (this.pendingRenderTasks.has(canvasId)) {
        const task = this.pendingRenderTasks.get(canvasId);
        task.cancelled = true;
        this.pendingRenderTasks.delete(canvasId);
      }
      
      if (this.activeRenderTask && this.activeRenderTask.id === canvasId) {
        this.activeRenderTask.cancelled = true;
      }
    }
  }
  
  // Singleton instance to be used throughout the application
  const renderManager = new RenderManager();
  export default renderManager;

(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.4' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/matching-cards/Matching-Cards.svelte generated by Svelte v3.29.4 */

    const { console: console_1, document: document_1 } = globals;
    const file = "src/components/matching-cards/Matching-Cards.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1t83b0s-style";
    	style.textContent = ".container.svelte-1t83b0s{display:flex;flex-direction:column;min-height:100vh}.card-wrap.svelte-1t83b0s{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;margin:auto;width:100vw;height:100vh}.card-item.svelte-1t83b0s{display:flex;justify-content:center;align-items:center;display:flex;width:calc(25% - 5px);height:calc(50% - 10px);background-color:#222;font-size:0px;color:#fff;cursor:pointer;transition:all 0.35s}.card-item.svelte-1t83b0s:hover{font-size:32px;background-color:#333}.card-item.is-open.svelte-1t83b0s{background-color:#ddd;color:red}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWF0Y2hpbmctQ2FyZHMuc3ZlbHRlIiwic291cmNlcyI6WyJNYXRjaGluZy1DYXJkcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgICBsZXQgY2FyZHMgPSA4XG4gICAgbGV0IGRhdGEgPSBbXG4gICAgICAgIHsgaWQ6IDEsIHZhbHVlOiAxLCBpbWc6ICcnIH0sXG4gICAgICAgIHsgaWQ6IDIsIHZhbHVlOiAxLCBpbWc6ICcnIH0sXG4gICAgICAgIHsgaWQ6IDMsIHZhbHVlOiAyLCBpbWc6ICcnIH0sXG4gICAgICAgIHsgaWQ6IDQsIHZhbHVlOiAyLCBpbWc6ICcnIH0sXG4gICAgICAgIHsgaWQ6IDUsIHZhbHVlOiAzLCBpbWc6ICcnIH0sXG4gICAgICAgIHsgaWQ6IDYsIHZhbHVlOiAzLCBpbWc6ICcnIH0sXG4gICAgICAgIHsgaWQ6IDcsIHZhbHVlOiA0LCBpbWc6ICcnIH0sXG4gICAgICAgIHsgaWQ6IDgsIHZhbHVlOiA0LCBpbWc6ICcnIH1cbiAgICBdXG4gICAgbGV0IHBpY2tlZE51bSwgcmFuZG9tTnVtXG4gICAgbGV0IHNodWZmbGVEYXRhID0gW11cblxuICAgIGxldCBzZWxlY3RlZENhcmRzID0gW11cbiAgICBsZXQgc2VsZWN0ZWROdW1zID0gW11cbiAgICBsZXQgc3VtLCBpc09wZW5cbiAgICBcbiAgICBmdW5jdGlvbiBzaHVmZmxlQ2FyZHMoKSB7XG4gICAgICAgIGZvcihsZXQgaT0wOyBpPGNhcmRzOyBpKyspIHtcbiAgICAgICAgICAgIHJhbmRvbU51bSA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiBkYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHBpY2tlZE51bSA9IGRhdGFbcmFuZG9tTnVtXVxuICAgICAgICAgICAgc2h1ZmZsZURhdGEgPSBbLi4uc2h1ZmZsZURhdGEsIHBpY2tlZE51bV1cbiAgICAgICAgICAgIGRhdGEuc3BsaWNlKHJhbmRvbU51bSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzaHVmZmxlQ2FyZHMoKVxuICAgICAgICBcbiAgICBmdW5jdGlvbiBjbGlja0NhcmQoaWQsIHZhbHVlKXtcbiAgICAgICAgaWYgKHNlbGVjdGVkQ2FyZHMubGVuZ3RoPDIpIHtcbiAgICAgICAgICAgIHNlbGVjdGVkQ2FyZHMgPSBbLi4uc2VsZWN0ZWRDYXJkcywgdmFsdWVdXG4gICAgICAgICAgICBzZWxlY3RlZE51bXMgPSBbLi4uc2VsZWN0ZWROdW1zLCBpZF1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdGVkQ2FyZHMgPSBbdmFsdWVdXG4gICAgICAgICAgICBzZWxlY3RlZE51bXMgPSBbaWRdXG4gICAgICAgIH1cbiAgICAgICAgY2hlY2tDYXJkKGlkKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrQ2FyZChpZCkge1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY2FyZC1pdGVtW2RhdGEtaW5kZXg9XCInKyBpZCArJ1wiXScpLmNsYXNzTGlzdC5hZGQoJ2lzLW9wZW4nKVxuICAgICAgICBsZXQgZmxpcEJhY2sgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY2FyZC1pdGVtW2RhdGEtaW5kZXg9XCInKyBpZCArJ1wiXScpLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLW9wZW4nKVxuICAgICAgICB9LDUwMClcbiAgICAgICAgXG4gICAgICAgIGlmIChzZWxlY3RlZENhcmRzLmxlbmd0aD09MikgeyAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkQ2FyZHNbMF0gPT09IHNlbGVjdGVkQ2FyZHNbMV0pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ29ycmVjdCEnKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNlbGVjdGVkTnVtc1swXSwgc2VsZWN0ZWROdW1zWzFdKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ05vdCBDb3JyZWN0IScpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwiY29udGFpbmVyXCI+XG4gICAgPHVsIGNsYXNzPVwiY2FyZC13cmFwXCI+XG4gICAgICAgIHsjZWFjaCBzaHVmZmxlRGF0YSBhcyBzaHVmZmxlLCBpbmRleCAoc2h1ZmZsZSl9XG4gICAgICAgICAgICA8bGkgY2xhc3M9XCJjYXJkLWl0ZW1cIlxuICAgICAgICAgICAgICAgIGNsYXNzOmlzLW9wZW49eyBpc09wZW4gfVxuICAgICAgICAgICAgICAgIGRhdGEtaW5kZXg9eyBpbmRleCsxIH1cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17KCkgPT4gY2xpY2tDYXJkKGluZGV4KzEsIHNodWZmbGUudmFsdWUpfT57IHNodWZmbGUudmFsdWUgfTwvbGk+XG4gICAgICAgIHsvZWFjaH1cbiAgICA8L3VsPlxuPC9kaXY+XG5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiPi5jb250YWluZXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBtaW4taGVpZ2h0OiAxMDB2aDtcbn1cblxuLmNhcmQtd3JhcCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtd3JhcDogd3JhcDtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBtYXJnaW46IGF1dG87XG4gIHdpZHRoOiAxMDB2dztcbiAgaGVpZ2h0OiAxMDB2aDtcbn1cblxuLmNhcmQtaXRlbSB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBkaXNwbGF5OiBmbGV4O1xuICB3aWR0aDogY2FsYygyNSUgLSA1cHgpO1xuICBoZWlnaHQ6IGNhbGMoNTAlIC0gMTBweCk7XG4gIGJhY2tncm91bmQtY29sb3I6ICMyMjI7XG4gIGZvbnQtc2l6ZTogMHB4O1xuICBjb2xvcjogI2ZmZjtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICB0cmFuc2l0aW9uOiBhbGwgMC4zNXM7XG59XG4uY2FyZC1pdGVtOmhvdmVyIHtcbiAgZm9udC1zaXplOiAzMnB4O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzMzO1xufVxuLmNhcmQtaXRlbS5pcy1vcGVuIHtcbiAgYmFja2dyb3VuZC1jb2xvcjogI2RkZDtcbiAgY29sb3I6IHJlZDtcbn08L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXdFbUIsVUFBVSxlQUFDLENBQUMsQUFDN0IsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsTUFBTSxDQUN0QixVQUFVLENBQUUsS0FBSyxBQUNuQixDQUFDLEFBRUQsVUFBVSxlQUFDLENBQUMsQUFDVixPQUFPLENBQUUsSUFBSSxDQUNiLFNBQVMsQ0FBRSxJQUFJLENBQ2YsZUFBZSxDQUFFLGFBQWEsQ0FDOUIsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsTUFBTSxDQUFFLElBQUksQ0FDWixLQUFLLENBQUUsS0FBSyxDQUNaLE1BQU0sQ0FBRSxLQUFLLEFBQ2YsQ0FBQyxBQUVELFVBQVUsZUFBQyxDQUFDLEFBQ1YsT0FBTyxDQUFFLElBQUksQ0FDYixlQUFlLENBQUUsTUFBTSxDQUN2QixXQUFXLENBQUUsTUFBTSxDQUNuQixPQUFPLENBQUUsSUFBSSxDQUNiLEtBQUssQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ3RCLE1BQU0sQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ3hCLGdCQUFnQixDQUFFLElBQUksQ0FDdEIsU0FBUyxDQUFFLEdBQUcsQ0FDZCxLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxPQUFPLENBQ2YsVUFBVSxDQUFFLEdBQUcsQ0FBQyxLQUFLLEFBQ3ZCLENBQUMsQUFDRCx5QkFBVSxNQUFNLEFBQUMsQ0FBQyxBQUNoQixTQUFTLENBQUUsSUFBSSxDQUNmLGdCQUFnQixDQUFFLElBQUksQUFDeEIsQ0FBQyxBQUNELFVBQVUsUUFBUSxlQUFDLENBQUMsQUFDbEIsZ0JBQWdCLENBQUUsSUFBSSxDQUN0QixLQUFLLENBQUUsR0FBRyxBQUNaLENBQUMifQ== */";
    	append_dev(document_1.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (64:8) {#each shuffleData as shuffle, index (shuffle)}
    function create_each_block(key_1, ctx) {
    	let li;
    	let t_value = /*shuffle*/ ctx[13].value + "";
    	let t;
    	let li_data_index_value;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[3](/*index*/ ctx[15], /*shuffle*/ ctx[13], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "card-item svelte-1t83b0s");
    			attr_dev(li, "data-index", li_data_index_value = /*index*/ ctx[15] + 1);
    			toggle_class(li, "is-open", /*isOpen*/ ctx[1]);
    			add_location(li, file, 64, 12, 1841);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);

    			if (!mounted) {
    				dispose = listen_dev(li, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*shuffleData*/ 1 && t_value !== (t_value = /*shuffle*/ ctx[13].value + "")) set_data_dev(t, t_value);

    			if (dirty & /*shuffleData*/ 1 && li_data_index_value !== (li_data_index_value = /*index*/ ctx[15] + 1)) {
    				attr_dev(li, "data-index", li_data_index_value);
    			}

    			if (dirty & /*isOpen*/ 2) {
    				toggle_class(li, "is-open", /*isOpen*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(64:8) {#each shuffleData as shuffle, index (shuffle)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_value = /*shuffleData*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*shuffle*/ ctx[13];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "card-wrap svelte-1t83b0s");
    			add_location(ul, file, 62, 4, 1750);
    			attr_dev(div, "class", "container svelte-1t83b0s");
    			add_location(div, file, 61, 0, 1722);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*shuffleData, isOpen, clickCard*/ 7) {
    				const each_value = /*shuffleData*/ ctx[0];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Matching_Cards", slots, []);
    	let cards = 8;

    	let data = [
    		{ id: 1, value: 1, img: "" },
    		{ id: 2, value: 1, img: "" },
    		{ id: 3, value: 2, img: "" },
    		{ id: 4, value: 2, img: "" },
    		{ id: 5, value: 3, img: "" },
    		{ id: 6, value: 3, img: "" },
    		{ id: 7, value: 4, img: "" },
    		{ id: 8, value: 4, img: "" }
    	];

    	let pickedNum, randomNum;
    	let shuffleData = [];
    	let selectedCards = [];
    	let selectedNums = [];
    	let sum, isOpen;

    	function shuffleCards() {
    		for (let i = 0; i < cards; i++) {
    			randomNum = parseInt(Math.random() * data.length);
    			pickedNum = data[randomNum];
    			$$invalidate(0, shuffleData = [...shuffleData, pickedNum]);
    			data.splice(randomNum, 1);
    		}
    	}

    	shuffleCards();

    	function clickCard(id, value) {
    		if (selectedCards.length < 2) {
    			selectedCards = [...selectedCards, value];
    			selectedNums = [...selectedNums, id];
    		} else {
    			selectedCards = [value];
    			selectedNums = [id];
    		}

    		checkCard(id);
    	}

    	function checkCard(id) {
    		document.querySelector(".card-item[data-index=\"" + id + "\"]").classList.add("is-open");

    		let flipBack = setTimeout(
    			function () {
    				document.querySelector(".card-item[data-index=\"" + id + "\"]").classList.remove("is-open");
    			},
    			500
    		);

    		if (selectedCards.length == 2) {
    			if (selectedCards[0] === selectedCards[1]) {
    				console.log("Correct!");
    				console.log(selectedNums[0], selectedNums[1]);
    			} else {
    				console.log("Not Correct!");
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Matching_Cards> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (index, shuffle) => clickCard(index + 1, shuffle.value);

    	$$self.$capture_state = () => ({
    		cards,
    		data,
    		pickedNum,
    		randomNum,
    		shuffleData,
    		selectedCards,
    		selectedNums,
    		sum,
    		isOpen,
    		shuffleCards,
    		clickCard,
    		checkCard
    	});

    	$$self.$inject_state = $$props => {
    		if ("cards" in $$props) cards = $$props.cards;
    		if ("data" in $$props) data = $$props.data;
    		if ("pickedNum" in $$props) pickedNum = $$props.pickedNum;
    		if ("randomNum" in $$props) randomNum = $$props.randomNum;
    		if ("shuffleData" in $$props) $$invalidate(0, shuffleData = $$props.shuffleData);
    		if ("selectedCards" in $$props) selectedCards = $$props.selectedCards;
    		if ("selectedNums" in $$props) selectedNums = $$props.selectedNums;
    		if ("sum" in $$props) sum = $$props.sum;
    		if ("isOpen" in $$props) $$invalidate(1, isOpen = $$props.isOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [shuffleData, isOpen, clickCard, click_handler];
    }

    class Matching_Cards extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document_1.getElementById("svelte-1t83b0s-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Matching_Cards",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.29.4 */

    function create_fragment$1(ctx) {
    	let matchingcard;
    	let current;
    	matchingcard = new Matching_Cards({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(matchingcard.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(matchingcard, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(matchingcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(matchingcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(matchingcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ MatchingCard: Matching_Cards });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map

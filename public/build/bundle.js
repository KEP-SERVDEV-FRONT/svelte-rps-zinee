
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
    function space() {
        return text(' ');
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
    	style.id = "svelte-ntfnm6-style";
    	style.textContent = "h1.svelte-ntfnm6{margin-top:auto;font-size:50px;color:#ddd;text-align:center}.container.svelte-ntfnm6{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;background-color:#000}.card-wrap.svelte-ntfnm6{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;margin:auto;width:100vw;height:80vh}.card-item.svelte-ntfnm6{position:relative;display:flex;justify-content:center;align-items:center;display:flex;margin:10px;width:calc(100% / 6 - 20px);height:50%;background-color:#222;background-repeat:no-repeat;background-size:cover;background-position:center;font-size:0px;color:#fff;cursor:pointer}.card-item.svelte-ntfnm6::after{content:\"\";position:absolute;top:0;left:0;display:block;width:100%;height:100%;background-color:#222;transition:all 0.5s linear}.card-item.svelte-ntfnm6:hover::after{opacity:0}.card-item.is-open.svelte-ntfnm6::after{opacity:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWF0Y2hpbmctQ2FyZHMuc3ZlbHRlIiwic291cmNlcyI6WyJNYXRjaGluZy1DYXJkcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgICBsZXQgZGF0YSA9IFtcbiAgICAgICAgeyB2YWx1ZTogMSwgaW1nOiAnaHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy83LzdkL0lVX01lbE9uX011c2ljX0F3YXJkc18yMDE3XzA2LmpwZycsIGlzT3BlbjogZmFsc2UgfSxcbiAgICAgICAgeyB2YWx1ZTogMSwgaW1nOiAnaHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy83LzdkL0lVX01lbE9uX011c2ljX0F3YXJkc18yMDE3XzA2LmpwZycsIGlzT3BlbjogZmFsc2UgfSxcbiAgICAgICAgeyB2YWx1ZTogMiwgaW1nOiAnaHR0cHM6Ly9pbWFnZS5idWdzbS5jby5rci9hcnRpc3QvaW1hZ2VzLzEwMDAvODAwNDkxLzgwMDQ5MTI2LmpwZycsIGlzT3BlbjogZmFsc2UgfSxcbiAgICAgICAgeyB2YWx1ZTogMiwgaW1nOiAnaHR0cHM6Ly9pbWFnZS5idWdzbS5jby5rci9hcnRpc3QvaW1hZ2VzLzEwMDAvODAwNDkxLzgwMDQ5MTI2LmpwZycsIGlzT3BlbjogZmFsc2UgfSxcbiAgICAgICAgeyB2YWx1ZTogMywgaW1nOiAnaHR0cHM6Ly9pbWFnZS5uZXdzMS5rci9zeXN0ZW0vcGhvdG9zLzIwMjAvMi8xOC80MDU5MjI1L2FydGljbGUuanBnL2RpbXMvb3B0aW1pemUnLCBpc09wZW46IGZhbHNlIH0sXG4gICAgICAgIHsgdmFsdWU6IDMsIGltZzogJ2h0dHBzOi8vaW1hZ2UubmV3czEua3Ivc3lzdGVtL3Bob3Rvcy8yMDIwLzIvMTgvNDA1OTIyNS9hcnRpY2xlLmpwZy9kaW1zL29wdGltaXplJywgaXNPcGVuOiBmYWxzZSB9LFxuICAgICAgICB7IHZhbHVlOiA0LCBpbWc6ICdodHRwczovL2RpbWcuZG9uZ2EuY29tL3dwcy9ORVdTL0lNQUdFLzIwMTkvMTIvMzEvOTkwMjQxMzcuMi5qcGcnLCBpc09wZW46IGZhbHNlIH0sXG4gICAgICAgIHsgdmFsdWU6IDQsIGltZzogJ2h0dHBzOi8vZGltZy5kb25nYS5jb20vd3BzL05FV1MvSU1BR0UvMjAxOS8xMi8zMS85OTAyNDEzNy4yLmpwZycsIGlzT3BlbjogZmFsc2UgfSxcbiAgICAgICAgeyB2YWx1ZTogNSwgaW1nOiAnaHR0cHM6Ly9pLnBpbmltZy5jb20vb3JpZ2luYWxzLzc5LzQ1LzhmLzc5NDU4Zjc5ZmNkZjVkOTM0NWE4NmZhZjQzMGMyMDkxLmpwZycsIGlzT3BlbjogZmFsc2UgfSxcbiAgICAgICAgeyB2YWx1ZTogNSwgaW1nOiAnaHR0cHM6Ly9pLnBpbmltZy5jb20vb3JpZ2luYWxzLzc5LzQ1LzhmLzc5NDU4Zjc5ZmNkZjVkOTM0NWE4NmZhZjQzMGMyMDkxLmpwZycsIGlzT3BlbjogZmFsc2UgfSxcbiAgICAgICAgeyB2YWx1ZTogNiwgaW1nOiAnaHR0cHM6Ly9lbmNyeXB0ZWQtdGJuMC5nc3RhdGljLmNvbS9pbWFnZXM/cT10Ym4lM0FBTmQ5R2NUY3RrMGU5bUhWa29tYS1sNTBpSXFubFZDR3lPbVcyTGFYRUEmdXNxcD1DQVUnLCBpc09wZW46IGZhbHNlIH0sXG4gICAgICAgIHsgdmFsdWU6IDYsIGltZzogJ2h0dHBzOi8vZW5jcnlwdGVkLXRibjAuZ3N0YXRpYy5jb20vaW1hZ2VzP3E9dGJuJTNBQU5kOUdjVGN0azBlOW1IVmtvbWEtbDUwaUlxbmxWQ0d5T21XMkxhWEVBJnVzcXA9Q0FVJywgaXNPcGVuOiBmYWxzZSB9XG4gICAgXVxuICAgIGxldCBjYXJkcyA9IGRhdGEubGVuZ3RoXG4gICAgbGV0IHBpY2tlZE51bSwgcmFuZG9tTnVtXG4gICAgbGV0IHNodWZmbGVEYXRhID0gW11cblxuICAgIGxldCBzZWxlY3RlZENhcmRzID0gW11cbiAgICBsZXQgc2VsZWN0ZWROdW1zID0gW11cbiAgICBsZXQgc3VtLCBpc09wZW5cblxuICAgIHNodWZmbGVDYXJkcygpXG5cbiAgICBmdW5jdGlvbiBzaHVmZmxlQ2FyZHMoKSB7XG4gICAgICAgIGZvcihsZXQgaT0wOyBpPGNhcmRzOyBpKyspIHtcbiAgICAgICAgICAgIHJhbmRvbU51bSA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiBkYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHBpY2tlZE51bSA9IGRhdGFbcmFuZG9tTnVtXVxuICAgICAgICAgICAgc2h1ZmZsZURhdGEgPSBbLi4uc2h1ZmZsZURhdGEsIHBpY2tlZE51bV1cbiAgICAgICAgICAgIGRhdGEuc3BsaWNlKHJhbmRvbU51bSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgICAgIFxuICAgIGZ1bmN0aW9uIGNsaWNrQ2FyZChpZCwgdmFsdWUpe1xuICAgICAgICBpZiAoc2VsZWN0ZWRDYXJkcy5sZW5ndGg8Mikge1xuICAgICAgICAgICAgc2VsZWN0ZWRDYXJkcyA9IFsuLi5zZWxlY3RlZENhcmRzLCB2YWx1ZV1cbiAgICAgICAgICAgIHNlbGVjdGVkTnVtcyA9IFsuLi5zZWxlY3RlZE51bXMsIGlkXVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0ZWRDYXJkcyA9IFt2YWx1ZV1cbiAgICAgICAgICAgIHNlbGVjdGVkTnVtcyA9IFtpZF1cbiAgICAgICAgfVxuICAgICAgICBjaGVja0NhcmQoaWQpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tDYXJkKGlkKSB7ICAgICAgICBcbiAgICAgICAgaWYgKHNlbGVjdGVkQ2FyZHMubGVuZ3RoPT0yKSB7ICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRDYXJkc1swXSA9PT0gc2VsZWN0ZWRDYXJkc1sxXSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb3JyZWN0IScpXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNhcmQtaXRlbVtkYXRhLWluZGV4PVwiJysgc2VsZWN0ZWROdW1zWzBdICsnXCJdJykuY2xhc3NMaXN0LmFkZCgnaXMtb3BlbicpXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNhcmQtaXRlbVtkYXRhLWluZGV4PVwiJysgc2VsZWN0ZWROdW1zWzFdICsnXCJdJykuY2xhc3NMaXN0LmFkZCgnaXMtb3BlbicpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coc2VsZWN0ZWROdW1zWzBdLCBzZWxlY3RlZE51bXNbMV0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnTm90IENvcnJlY3QhJylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwiY29udGFpbmVyXCI+XG4gICAgPGgxPuyVhOydtOycoOulvCDssL7slYTrnbw8L2gxPlxuICAgIDx1bCBjbGFzcz1cImNhcmQtd3JhcFwiPlxuICAgICAgICB7I2VhY2ggc2h1ZmZsZURhdGEgYXMgc2h1ZmZsZSwgaW5kZXggKHNodWZmbGUpfVxuICAgICAgICAgICAgPGxpIGNsYXNzPVwiY2FyZC1pdGVtXCJcbiAgICAgICAgICAgICAgICBjbGFzczppcy1vcGVuPXsgaXNPcGVuIH1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImJhY2tncm91bmQtaW1hZ2U6IHVybCgneyBzaHVmZmxlLmltZyB9JylcIlxuICAgICAgICAgICAgICAgIGRhdGEtaW5kZXg9eyBpbmRleCsxIH1cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17KCkgPT4gY2xpY2tDYXJkKGluZGV4KzEsIHNodWZmbGUudmFsdWUpfT57IHNodWZmbGUudmFsdWUgfTwvbGk+XG4gICAgICAgIHsvZWFjaH1cbiAgICA8L3VsPlxuPC9kaXY+XG5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiPmgxIHtcbiAgbWFyZ2luLXRvcDogYXV0bztcbiAgZm9udC1zaXplOiA1MHB4O1xuICBjb2xvcjogI2RkZDtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xufVxuXG4uY29udGFpbmVyIHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIG1pbi1oZWlnaHQ6IDEwMHZoO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMDAwO1xufVxuXG4uY2FyZC13cmFwIHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC13cmFwOiB3cmFwO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgbWFyZ2luOiBhdXRvO1xuICB3aWR0aDogMTAwdnc7XG4gIGhlaWdodDogODB2aDtcbn1cblxuLmNhcmQtaXRlbSB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIG1hcmdpbjogMTBweDtcbiAgd2lkdGg6IGNhbGMoMTAwJSAvIDYgLSAyMHB4KTtcbiAgaGVpZ2h0OiA1MCU7XG4gIGJhY2tncm91bmQtY29sb3I6ICMyMjI7XG4gIGJhY2tncm91bmQtcmVwZWF0OiBuby1yZXBlYXQ7XG4gIGJhY2tncm91bmQtc2l6ZTogY292ZXI7XG4gIGJhY2tncm91bmQtcG9zaXRpb246IGNlbnRlcjtcbiAgZm9udC1zaXplOiAwcHg7XG4gIGNvbG9yOiAjZmZmO1xuICBjdXJzb3I6IHBvaW50ZXI7XG59XG4uY2FyZC1pdGVtOjphZnRlciB7XG4gIGNvbnRlbnQ6IFwiXCI7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICBkaXNwbGF5OiBibG9jaztcbiAgd2lkdGg6IDEwMCU7XG4gIGhlaWdodDogMTAwJTtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzIyMjtcbiAgdHJhbnNpdGlvbjogYWxsIDAuNXMgbGluZWFyO1xufVxuLmNhcmQtaXRlbTpob3Zlcjo6YWZ0ZXIge1xuICBvcGFjaXR5OiAwO1xufVxuLmNhcmQtaXRlbS5pcy1vcGVuOjphZnRlciB7XG4gIG9wYWNpdHk6IDA7XG59PC9zdHlsZT5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUEwRW1CLEVBQUUsY0FBQyxDQUFDLEFBQ3JCLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLFNBQVMsQ0FBRSxJQUFJLENBQ2YsS0FBSyxDQUFFLElBQUksQ0FDWCxVQUFVLENBQUUsTUFBTSxBQUNwQixDQUFDLEFBRUQsVUFBVSxjQUFDLENBQUMsQUFDVixPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxNQUFNLENBQ3RCLGVBQWUsQ0FBRSxNQUFNLENBQ3ZCLFdBQVcsQ0FBRSxNQUFNLENBQ25CLFVBQVUsQ0FBRSxLQUFLLENBQ2pCLGdCQUFnQixDQUFFLElBQUksQUFDeEIsQ0FBQyxBQUVELFVBQVUsY0FBQyxDQUFDLEFBQ1YsT0FBTyxDQUFFLElBQUksQ0FDYixTQUFTLENBQUUsSUFBSSxDQUNmLGVBQWUsQ0FBRSxNQUFNLENBQ3ZCLFdBQVcsQ0FBRSxNQUFNLENBQ25CLE1BQU0sQ0FBRSxJQUFJLENBQ1osS0FBSyxDQUFFLEtBQUssQ0FDWixNQUFNLENBQUUsSUFBSSxBQUNkLENBQUMsQUFFRCxVQUFVLGNBQUMsQ0FBQyxBQUNWLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsZUFBZSxDQUFFLE1BQU0sQ0FDdkIsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsT0FBTyxDQUFFLElBQUksQ0FDYixNQUFNLENBQUUsSUFBSSxDQUNaLEtBQUssQ0FBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDNUIsTUFBTSxDQUFFLEdBQUcsQ0FDWCxnQkFBZ0IsQ0FBRSxJQUFJLENBQ3RCLGlCQUFpQixDQUFFLFNBQVMsQ0FDNUIsZUFBZSxDQUFFLEtBQUssQ0FDdEIsbUJBQW1CLENBQUUsTUFBTSxDQUMzQixTQUFTLENBQUUsR0FBRyxDQUNkLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLE9BQU8sQUFDakIsQ0FBQyxBQUNELHdCQUFVLE9BQU8sQUFBQyxDQUFDLEFBQ2pCLE9BQU8sQ0FBRSxFQUFFLENBQ1gsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsR0FBRyxDQUFFLENBQUMsQ0FDTixJQUFJLENBQUUsQ0FBQyxDQUNQLE9BQU8sQ0FBRSxLQUFLLENBQ2QsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLGdCQUFnQixDQUFFLElBQUksQ0FDdEIsVUFBVSxDQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxBQUM3QixDQUFDLEFBQ0Qsd0JBQVUsTUFBTSxPQUFPLEFBQUMsQ0FBQyxBQUN2QixPQUFPLENBQUUsQ0FBQyxBQUNaLENBQUMsQUFDRCxVQUFVLHNCQUFRLE9BQU8sQUFBQyxDQUFDLEFBQ3pCLE9BQU8sQ0FBRSxDQUFDLEFBQ1osQ0FBQyJ9 */";
    	append_dev(document_1.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (65:8) {#each shuffleData as shuffle, index (shuffle)}
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
    			attr_dev(li, "class", "card-item svelte-ntfnm6");
    			set_style(li, "background-image", "url('" + /*shuffle*/ ctx[13].img + "')");
    			attr_dev(li, "data-index", li_data_index_value = /*index*/ ctx[15] + 1);
    			toggle_class(li, "is-open", /*isOpen*/ ctx[1]);
    			add_location(li, file, 65, 12, 3027);
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

    			if (dirty & /*shuffleData*/ 1) {
    				set_style(li, "background-image", "url('" + /*shuffle*/ ctx[13].img + "')");
    			}

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
    		source: "(65:8) {#each shuffleData as shuffle, index (shuffle)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let h1;
    	let t1;
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
    			h1 = element("h1");
    			h1.textContent = "아이유를 찾아라";
    			t1 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "svelte-ntfnm6");
    			add_location(h1, file, 62, 4, 2914);
    			attr_dev(ul, "class", "card-wrap svelte-ntfnm6");
    			add_location(ul, file, 63, 4, 2936);
    			attr_dev(div, "class", "container svelte-ntfnm6");
    			add_location(div, file, 61, 0, 2886);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
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

    	let data = [
    		{
    			value: 1,
    			img: "https://upload.wikimedia.org/wikipedia/commons/7/7d/IU_MelOn_Music_Awards_2017_06.jpg",
    			isOpen: false
    		},
    		{
    			value: 1,
    			img: "https://upload.wikimedia.org/wikipedia/commons/7/7d/IU_MelOn_Music_Awards_2017_06.jpg",
    			isOpen: false
    		},
    		{
    			value: 2,
    			img: "https://image.bugsm.co.kr/artist/images/1000/800491/80049126.jpg",
    			isOpen: false
    		},
    		{
    			value: 2,
    			img: "https://image.bugsm.co.kr/artist/images/1000/800491/80049126.jpg",
    			isOpen: false
    		},
    		{
    			value: 3,
    			img: "https://image.news1.kr/system/photos/2020/2/18/4059225/article.jpg/dims/optimize",
    			isOpen: false
    		},
    		{
    			value: 3,
    			img: "https://image.news1.kr/system/photos/2020/2/18/4059225/article.jpg/dims/optimize",
    			isOpen: false
    		},
    		{
    			value: 4,
    			img: "https://dimg.donga.com/wps/NEWS/IMAGE/2019/12/31/99024137.2.jpg",
    			isOpen: false
    		},
    		{
    			value: 4,
    			img: "https://dimg.donga.com/wps/NEWS/IMAGE/2019/12/31/99024137.2.jpg",
    			isOpen: false
    		},
    		{
    			value: 5,
    			img: "https://i.pinimg.com/originals/79/45/8f/79458f79fcdf5d9345a86faf430c2091.jpg",
    			isOpen: false
    		},
    		{
    			value: 5,
    			img: "https://i.pinimg.com/originals/79/45/8f/79458f79fcdf5d9345a86faf430c2091.jpg",
    			isOpen: false
    		},
    		{
    			value: 6,
    			img: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTctk0e9mHVkoma-l50iIqnlVCGyOmW2LaXEA&usqp=CAU",
    			isOpen: false
    		},
    		{
    			value: 6,
    			img: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTctk0e9mHVkoma-l50iIqnlVCGyOmW2LaXEA&usqp=CAU",
    			isOpen: false
    		}
    	];

    	let cards = data.length;
    	let pickedNum, randomNum;
    	let shuffleData = [];
    	let selectedCards = [];
    	let selectedNums = [];
    	let sum, isOpen;
    	shuffleCards();

    	function shuffleCards() {
    		for (let i = 0; i < cards; i++) {
    			randomNum = parseInt(Math.random() * data.length);
    			pickedNum = data[randomNum];
    			$$invalidate(0, shuffleData = [...shuffleData, pickedNum]);
    			data.splice(randomNum, 1);
    		}
    	}

    	function clickCard(id, value) {
    		if (selectedCards.length < 2) {
    			selectedCards = [...selectedCards, value];
    			selectedNums = [...selectedNums, id];
    		} else {
    			selectedCards = [value];
    			selectedNums = [id];
    		}

    		checkCard();
    	}

    	function checkCard(id) {
    		if (selectedCards.length == 2) {
    			if (selectedCards[0] === selectedCards[1]) {
    				console.log("Correct!");
    				document.querySelector(".card-item[data-index=\"" + selectedNums[0] + "\"]").classList.add("is-open");
    				document.querySelector(".card-item[data-index=\"" + selectedNums[1] + "\"]").classList.add("is-open");
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
    		data,
    		cards,
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
    		if ("data" in $$props) data = $$props.data;
    		if ("cards" in $$props) cards = $$props.cards;
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
    		if (!document_1.getElementById("svelte-ntfnm6-style")) add_css();
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

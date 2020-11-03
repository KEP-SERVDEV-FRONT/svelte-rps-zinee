
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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

    /* src/App.svelte generated by Svelte v3.29.4 */

    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-p8iabx-style";
    	style.textContent = ".inner.svelte-p8iabx.svelte-p8iabx{display:flex;width:100%;height:100vh}.inner.svelte-p8iabx .com.svelte-p8iabx{display:flex;justify-content:center;align-items:center;flex:1}.inner.svelte-p8iabx .me.svelte-p8iabx{position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;flex:1}.inner.svelte-p8iabx .me .btn-area.svelte-p8iabx{position:absolute;bottom:10vh;left:0;right:0;text-align:center}.game-title.svelte-p8iabx.svelte-p8iabx{position:fixed;top:10vh;left:0;right:0;padding:10px;background:rgba(255,255,255,0.1);font-size:2em;text-align:center;z-index:1}.result.svelte-p8iabx.svelte-p8iabx{position:fixed;top:10vh;left:0;right:0;font-size:20em;text-align:center}.loser.svelte-p8iabx.svelte-p8iabx{background:rgba(255,0,0,0.1)}.winner.svelte-p8iabx.svelte-p8iabx{background:rgba(255,255,0,0.1)}h2.svelte-p8iabx.svelte-p8iabx{font-size:10em}button.svelte-p8iabx.svelte-p8iabx{font-size:5em}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwid3JhcHBlclwiPlxuXHQ8aDEgY2xhc3M9XCJnYW1lLXRpdGxlXCI+6rCA7JyE67CU7JyE67O0PC9oMT5cblx0PGgyIGNsYXNzPVwicmVzdWx0XCI+eyByZXN1bHQgfTwvaDI+XG5cdDxkaXYgY2xhc3M9XCJpbm5lclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJjb20gbG9zZXJcIj5cblx0XHRcdDxoMj57IGNvbXB1dGVyIH08L2gyPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJtZSB3aW5uZXJcIj5cblx0XHRcdDxoMj57IHByaW50IH08L2gyPlxuXHRcdFx0PGRpdiBjbGFzcz1cImJ0bi1hcmVhXCI+IFxuXHRcdFx0XHQ8YnV0dG9uIG9uOmNsaWNrPXsoKSA9PiBTRU5EKCfqsIDsnIQnKX0+4pyM77iPPC9idXR0b24+XG5cdFx0XHRcdDxidXR0b24gb246Y2xpY2s9eygpID0+IFNFTkQoJ+uwlOychCcpfT7inIo8L2J1dHRvbj5cblx0XHRcdFx0PGJ1dHRvbiBvbjpjbGljaz17KCkgPT4gU0VORCgn67O0Jyl9PvCflpA8L2J1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGU+XG5cdC5pbm5lciB7IGRpc3BsYXk6IGZsZXg7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMHZoOyB9XG5cdC5pbm5lciAuY29tIHsgZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGZsZXg6IDE7IH1cblx0LmlubmVyIC5tZSB7IHBvc2l0aW9uOiByZWxhdGl2ZTsgZGlzcGxheTogZmxleDsgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGZsZXg6IDE7IH1cblx0LmlubmVyIC5tZSAuYnRuLWFyZWEgeyBwb3NpdGlvbjogYWJzb2x1dGU7IGJvdHRvbTogMTB2aDsgbGVmdDogMDsgcmlnaHQ6IDA7IHRleHQtYWxpZ246IGNlbnRlcjsgfVxuXHQuZ2FtZS10aXRsZSB7IHBvc2l0aW9uOiBmaXhlZDsgdG9wOiAxMHZoOyBsZWZ0OiAwOyByaWdodDogMDsgcGFkZGluZzogMTBweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwwLjEpOyBmb250LXNpemU6IDJlbTsgdGV4dC1hbGlnbjogY2VudGVyOyB6LWluZGV4OiAxOyB9XG5cdC5yZXN1bHQgeyBwb3NpdGlvbjogZml4ZWQ7IHRvcDogMTB2aDsgbGVmdDogMDsgcmlnaHQ6IDA7IGZvbnQtc2l6ZTogMjBlbTsgdGV4dC1hbGlnbjogY2VudGVyOyB9XG5cdC5sb3NlciB7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDAsMCwwLjEpOyB9XG5cdC53aW5uZXIgeyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMCwwLjEpOyB9XG5cdGgyIHsgZm9udC1zaXplOiAxMGVtOyB9XG5cdGJ1dHRvbiB7IGZvbnQtc2l6ZTogNWVtOyB9XG48L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRsZXQgbnVtID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDMpXG5cdGxldCBjb21wdXRlciA9ICcnXG5cdGxldCBwcmludCA9ICfwn5GAJ1xuXHRsZXQgcmVzdWx0ID0gJydcblxuXHRmdW5jdGlvbiBBQ1RJT04oKSB7XG5cdFx0bnVtID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDMpXG5cdFx0aWYgKG51bSA9PSAwKSBjb21wdXRlciA9ICfinIzvuI8nXG5cdFx0ZWxzZSBpZiAobnVtID09IDEpIGNvbXB1dGVyID0gJ+Kciidcblx0XHRlbHNlIGlmIChudW0gPT0gMikgY29tcHV0ZXIgPSAn8J+WkCdcblx0fVxuXG5cdGZ1bmN0aW9uIFNFTkQobXkpIHtcblx0XHRjbGVhckludGVydmFsKHRpbWVyKVxuXG5cdFx0aWYgKG15PT0n6rCA7JyEJykgcHJpbnQgPSAn4pyM77iPJ1xuXHRcdGVsc2UgaWYgKG15ID09ICfrsJTsnIQnKSBwcmludCA9ICfinIonXG5cdFx0ZWxzZSBpZiAobXkgPT0gJ+uztCcpIHByaW50ID0gJ/CflpAnXG5cdH1cblxuXHRsZXQgdGltZXIgPSBzZXRJbnRlcnZhbChBQ1RJT04sIDI1MClcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFtQkMsTUFBTSw0QkFBQyxDQUFDLEFBQUMsT0FBTyxDQUFFLElBQUksQ0FBRSxLQUFLLENBQUUsSUFBSSxDQUFFLE1BQU0sQ0FBRSxLQUFLLEFBQUUsQ0FBQyxBQUNyRCxvQkFBTSxDQUFDLElBQUksY0FBQyxDQUFDLEFBQUMsT0FBTyxDQUFFLElBQUksQ0FBRSxlQUFlLENBQUUsTUFBTSxDQUFFLFdBQVcsQ0FBRSxNQUFNLENBQUUsSUFBSSxDQUFFLENBQUMsQUFBRSxDQUFDLEFBQ3JGLG9CQUFNLENBQUMsR0FBRyxjQUFDLENBQUMsQUFBQyxRQUFRLENBQUUsUUFBUSxDQUFFLE9BQU8sQ0FBRSxJQUFJLENBQUUsY0FBYyxDQUFFLE1BQU0sQ0FBRSxlQUFlLENBQUUsTUFBTSxDQUFFLFdBQVcsQ0FBRSxNQUFNLENBQUUsSUFBSSxDQUFFLENBQUMsQUFBRSxDQUFDLEFBQ2hJLG9CQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsY0FBQyxDQUFDLEFBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxNQUFNLENBQUUsSUFBSSxDQUFFLElBQUksQ0FBRSxDQUFDLENBQUUsS0FBSyxDQUFFLENBQUMsQ0FBRSxVQUFVLENBQUUsTUFBTSxBQUFFLENBQUMsQUFDakcsV0FBVyw0QkFBQyxDQUFDLEFBQUMsUUFBUSxDQUFFLEtBQUssQ0FBRSxHQUFHLENBQUUsSUFBSSxDQUFFLElBQUksQ0FBRSxDQUFDLENBQUUsS0FBSyxDQUFFLENBQUMsQ0FBRSxPQUFPLENBQUUsSUFBSSxDQUFFLFVBQVUsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFFLFNBQVMsQ0FBRSxHQUFHLENBQUUsVUFBVSxDQUFFLE1BQU0sQ0FBRSxPQUFPLENBQUUsQ0FBQyxBQUFFLENBQUMsQUFDaEssT0FBTyw0QkFBQyxDQUFDLEFBQUMsUUFBUSxDQUFFLEtBQUssQ0FBRSxHQUFHLENBQUUsSUFBSSxDQUFFLElBQUksQ0FBRSxDQUFDLENBQUUsS0FBSyxDQUFFLENBQUMsQ0FBRSxTQUFTLENBQUUsSUFBSSxDQUFFLFVBQVUsQ0FBRSxNQUFNLEFBQUUsQ0FBQyxBQUMvRixNQUFNLDRCQUFDLENBQUMsQUFBQyxVQUFVLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBRSxDQUFDLEFBQ3pDLE9BQU8sNEJBQUMsQ0FBQyxBQUFDLFVBQVUsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFFLENBQUMsQUFDNUMsRUFBRSw0QkFBQyxDQUFDLEFBQUMsU0FBUyxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ3ZCLE1BQU0sNEJBQUMsQ0FBQyxBQUFDLFNBQVMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment(ctx) {
    	let div4;
    	let h1;
    	let t1;
    	let h20;
    	let t3;
    	let div3;
    	let div0;
    	let h21;
    	let t4;
    	let t5;
    	let div2;
    	let h22;
    	let t6;
    	let t7;
    	let div1;
    	let button0;
    	let t9;
    	let button1;
    	let t11;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			h1 = element("h1");
    			h1.textContent = "가위바위보";
    			t1 = space();
    			h20 = element("h2");
    			h20.textContent = `${/*result*/ ctx[2]}`;
    			t3 = space();
    			div3 = element("div");
    			div0 = element("div");
    			h21 = element("h2");
    			t4 = text(/*computer*/ ctx[0]);
    			t5 = space();
    			div2 = element("div");
    			h22 = element("h2");
    			t6 = text(/*print*/ ctx[1]);
    			t7 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "✌️";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "✊";
    			t11 = space();
    			button2 = element("button");
    			button2.textContent = "🖐";
    			attr_dev(h1, "class", "game-title svelte-p8iabx");
    			add_location(h1, file, 1, 1, 23);
    			attr_dev(h20, "class", "result svelte-p8iabx");
    			add_location(h20, file, 2, 1, 58);
    			attr_dev(h21, "class", "svelte-p8iabx");
    			add_location(h21, file, 5, 3, 143);
    			attr_dev(div0, "class", "com loser svelte-p8iabx");
    			add_location(div0, file, 4, 2, 116);
    			attr_dev(h22, "class", "svelte-p8iabx");
    			add_location(h22, file, 8, 3, 203);
    			attr_dev(button0, "class", "svelte-p8iabx");
    			add_location(button0, file, 10, 4, 253);
    			attr_dev(button1, "class", "svelte-p8iabx");
    			add_location(button1, file, 11, 4, 305);
    			attr_dev(button2, "class", "svelte-p8iabx");
    			add_location(button2, file, 12, 4, 356);
    			attr_dev(div1, "class", "btn-area svelte-p8iabx");
    			add_location(div1, file, 9, 3, 225);
    			attr_dev(div2, "class", "me winner svelte-p8iabx");
    			add_location(div2, file, 7, 2, 176);
    			attr_dev(div3, "class", "inner svelte-p8iabx");
    			add_location(div3, file, 3, 1, 94);
    			attr_dev(div4, "class", "wrapper");
    			add_location(div4, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, h1);
    			append_dev(div4, t1);
    			append_dev(div4, h20);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h21);
    			append_dev(h21, t4);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, h22);
    			append_dev(h22, t6);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t9);
    			append_dev(div1, button1);
    			append_dev(div1, t11);
    			append_dev(div1, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[5], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*computer*/ 1) set_data_dev(t4, /*computer*/ ctx[0]);
    			if (dirty & /*print*/ 2) set_data_dev(t6, /*print*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots("App", slots, []);
    	let num = parseInt(Math.random() * 3);
    	let computer = "";
    	let print = "👀";
    	let result = "";

    	function ACTION() {
    		num = parseInt(Math.random() * 3);
    		if (num == 0) $$invalidate(0, computer = "✌️"); else if (num == 1) $$invalidate(0, computer = "✊"); else if (num == 2) $$invalidate(0, computer = "🖐");
    	}

    	function SEND(my) {
    		clearInterval(timer);
    		if (my == "가위") $$invalidate(1, print = "✌️"); else if (my == "바위") $$invalidate(1, print = "✊"); else if (my == "보") $$invalidate(1, print = "🖐");
    	}

    	let timer = setInterval(ACTION, 250);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => SEND("가위");
    	const click_handler_1 = () => SEND("바위");
    	const click_handler_2 = () => SEND("보");

    	$$self.$capture_state = () => ({
    		num,
    		computer,
    		print,
    		result,
    		ACTION,
    		SEND,
    		timer
    	});

    	$$self.$inject_state = $$props => {
    		if ("num" in $$props) num = $$props.num;
    		if ("computer" in $$props) $$invalidate(0, computer = $$props.computer);
    		if ("print" in $$props) $$invalidate(1, print = $$props.print);
    		if ("result" in $$props) $$invalidate(2, result = $$props.result);
    		if ("timer" in $$props) timer = $$props.timer;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [computer, print, result, SEND, click_handler, click_handler_1, click_handler_2];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-p8iabx-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
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

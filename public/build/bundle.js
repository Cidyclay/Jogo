
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
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
    function empty() {
        return text('');
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
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
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
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

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    let estado = writable('Menu');

    function trocarEstadoDoJogo(novoEstado) {
    	estado.set(novoEstado);
    }

    /* src\Jogar.svelte generated by Svelte v3.55.1 */
    const file$3 = "src\\Jogar.svelte";

    // (62:0) {#if num == 0}
    function create_if_block_7(ctx) {
    	let p;
    	let t1;
    	let input;
    	let t2;
    	let if_block_anchor;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*name*/ ctx[0] == /*array*/ ctx[7][0][1] + /*array*/ ctx[7][0][2] + /*array*/ ctx[7][0][3] + /*array*/ ctx[7][0][4] + /*array*/ ctx[7][0][5]) return create_if_block_8;
    		if (/*name*/ ctx[0] == "") return create_if_block_9;
    		return create_else_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Clube campeão da copa do brasil 2008 ?";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			add_location(p, file$3, 62, 0, 1112);
    			attr_dev(input, "placeholder", "Digite Aqui!");
    			add_location(input, file$3, 63, 0, 1159);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*name*/ ctx[0]);
    			insert_dev(target, t2, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*name*/ 1 && input.value !== /*name*/ ctx[0]) {
    				set_input_value(input, /*name*/ ctx[0]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t2);
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(62:0) {#if num == 0}",
    		ctx
    	});

    	return block;
    }

    // (70:2) {:else}
    function create_else_block_4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = `${/*errado*/ ctx[5]}`;
    			attr_dev(p, "id", "errado");
    			attr_dev(p, "class", "svelte-122hi5e");
    			add_location(p, file$3, 70, 3, 1470);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(70:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (68:23) 
    function create_if_block_9(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Esperando Digitar...";
    			add_location(p, file$3, 68, 2, 1427);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(68:23) ",
    		ctx
    	});

    	return block;
    }

    // (65:2) {#if name == array[0][1]+array[0][2]+array[0][3]+array[0][4]+array[0][5]}
    function create_if_block_8(ctx) {
    	let p;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Parabéns voce acertou o time é sport";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Proxima palavra";
    			add_location(p, file$3, 65, 3, 1293);
    			add_location(button, file$3, 66, 3, 1342);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(65:2) {#if name == array[0][1]+array[0][2]+array[0][3]+array[0][4]+array[0][5]}",
    		ctx
    	});

    	return block;
    }

    // (75:0) {#if num == 1 }
    function create_if_block_5(ctx) {
    	let p;
    	let t1;
    	let input;
    	let t2;
    	let if_block_anchor;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*name1*/ ctx[1] == /*array*/ ctx[7][3][0] + /*array*/ ctx[7][3][1] + /*array*/ ctx[7][3][2] + /*array*/ ctx[7][3][3] + /*array*/ ctx[7][3][4] + /*array*/ ctx[7][3][5] + /*array*/ ctx[7][3][6] + /*array*/ ctx[7][3][7]) return create_if_block_6;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Clube mineiro que tem como seu mascote o Galo ?";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			add_location(p, file$3, 75, 0, 1535);
    			attr_dev(input, "placeholder", "digite");
    			add_location(input, file$3, 76, 0, 1591);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*name1*/ ctx[1]);
    			insert_dev(target, t2, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_1*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*name1*/ 2 && input.value !== /*name1*/ ctx[1]) {
    				set_input_value(input, /*name1*/ ctx[1]);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t2);
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(75:0) {#if num == 1 }",
    		ctx
    	});

    	return block;
    }

    // (81:0) {:else}
    function create_else_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = `${/*errado*/ ctx[5]}`;
    			attr_dev(p, "id", "errado");
    			attr_dev(p, "class", "svelte-122hi5e");
    			add_location(p, file$3, 81, 0, 1857);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(81:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (78:0) {#if name1 == array[3][0]+array[3][1]+array[3][2]+array[3][3]+array[3][4]+array[3][5]+array[3][6]+array[3][7]}
    function create_if_block_6(ctx) {
    	let p;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "parabéns o time é Atletico-MG";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Proxima palavra";
    			add_location(p, file$3, 78, 0, 1752);
    			add_location(button, file$3, 79, 0, 1790);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(78:0) {#if name1 == array[3][0]+array[3][1]+array[3][2]+array[3][3]+array[3][4]+array[3][5]+array[3][6]+array[3][7]}",
    		ctx
    	});

    	return block;
    }

    // (86:0) {#if num == 2 }
    function create_if_block_3$1(ctx) {
    	let p;
    	let t1;
    	let input;
    	let t2;
    	let if_block_anchor;
    	let mounted;
    	let dispose;

    	function select_block_type_2(ctx, dirty) {
    		if (/*namex*/ ctx[2] == /*array*/ ctx[7][2][3] + /*array*/ ctx[7][3][3] + /*array*/ ctx[7][4][3] + /*array*/ ctx[7][5][3]) return create_if_block_4;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Clube paraense que tem como mascote um Leão";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			add_location(p, file$3, 86, 0, 1921);
    			attr_dev(input, "placeholder", "digite novamente");
    			add_location(input, file$3, 87, 0, 1973);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*namex*/ ctx[2]);
    			insert_dev(target, t2, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_2*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*namex*/ 4 && input.value !== /*namex*/ ctx[2]) {
    				set_input_value(input, /*namex*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t2);
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(86:0) {#if num == 2 }",
    		ctx
    	});

    	return block;
    }

    // (92:0) {:else}
    function create_else_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = `${/*errado*/ ctx[5]}`;
    			attr_dev(p, "id", "errado");
    			attr_dev(p, "class", "svelte-122hi5e");
    			add_location(p, file$3, 92, 0, 2194);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(92:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (89:0) {#if namex == array[2][3]+array[3][3]+array[4][3]+array[5][3]}
    function create_if_block_4(ctx) {
    	let p;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Parabéns o time é remo";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Proxima palavra";
    			add_location(p, file$3, 89, 0, 2096);
    			add_location(button, file$3, 90, 0, 2127);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(89:0) {#if namex == array[2][3]+array[3][3]+array[4][3]+array[5][3]}",
    		ctx
    	});

    	return block;
    }

    // (97:0) {#if num == 3 }
    function create_if_block_1$1(ctx) {
    	let p;
    	let t1;
    	let input;
    	let t2;
    	let if_block_anchor;
    	let mounted;
    	let dispose;

    	function select_block_type_3(ctx, dirty) {
    		if (/*namey*/ ctx[3] == /*array*/ ctx[7][0][1] + /*array*/ ctx[7][1][1] + /*array*/ ctx[7][2][1] + /*array*/ ctx[7][3][1] + /*array*/ ctx[7][4][1] + /*array*/ ctx[7][5][1]) return create_if_block_2$1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Clube paulista que teve como seu maior craque o Rei Pelé";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			add_location(p, file$3, 97, 0, 2258);
    			attr_dev(input, "placeholder", "digite novamente");
    			add_location(input, file$3, 98, 0, 2323);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*namey*/ ctx[3]);
    			insert_dev(target, t2, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_3*/ ctx[14]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*namey*/ 8 && input.value !== /*namey*/ ctx[3]) {
    				set_input_value(input, /*namey*/ ctx[3]);
    			}

    			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t2);
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(97:0) {#if num == 3 }",
    		ctx
    	});

    	return block;
    }

    // (103:0) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = `${/*errado*/ ctx[5]}`;
    			attr_dev(p, "id", "errado");
    			attr_dev(p, "class", "svelte-122hi5e");
    			add_location(p, file$3, 103, 0, 2570);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(103:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (100:0) {#if namey == array[0][1]+array[1][1]+array[2][1]+array[3][1]+array[4][1]+array[5][1]}
    function create_if_block_2$1(ctx) {
    	let p;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Parabéns o time é Santos";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Proxima palavra";
    			add_location(p, file$3, 100, 0, 2470);
    			add_location(button, file$3, 101, 0, 2503);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(100:0) {#if namey == array[0][1]+array[1][1]+array[2][1]+array[3][1]+array[4][1]+array[5][1]}",
    		ctx
    	});

    	return block;
    }

    // (110:0) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Você acertou ");
    			t1 = text(/*num*/ ctx[4]);
    			t2 = text(" palavra(s)");
    			add_location(p, file$3, 110, 0, 2706);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*num*/ 16) set_data_dev(t1, /*num*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(110:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (108:0) {#if num == 4}
    function create_if_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Parabéns voce acertou todas as palavras do caça palavras";
    			add_location(p, file$3, 108, 0, 2632);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(108:0) {#if num == 4}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div1;
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let h1;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let table;
    	let tr0;
    	let td0;
    	let td1;
    	let td2;
    	let td3;
    	let td4;
    	let td5;
    	let td6;
    	let td7;
    	let t18;
    	let tr1;
    	let td8;
    	let td9;
    	let td10;
    	let td11;
    	let td12;
    	let td13;
    	let td14;
    	let td15;
    	let t27;
    	let tr2;
    	let td16;
    	let td17;
    	let td18;
    	let td19;
    	let td20;
    	let td21;
    	let td22;
    	let td23;
    	let t36;
    	let tr3;
    	let td24;
    	let td25;
    	let td26;
    	let td27;
    	let td28;
    	let td29;
    	let td30;
    	let td31;
    	let t45;
    	let tr4;
    	let td32;
    	let td33;
    	let td34;
    	let td35;
    	let td36;
    	let td37;
    	let td38;
    	let td39;
    	let t54;
    	let tr5;
    	let td40;
    	let td41;
    	let td42;
    	let td43;
    	let td44;
    	let td45;
    	let td46;
    	let td47;
    	let t63;
    	let div0;
    	let mounted;
    	let dispose;
    	let if_block0 = /*num*/ ctx[4] == 0 && create_if_block_7(ctx);
    	let if_block1 = /*num*/ ctx[4] == 1 && create_if_block_5(ctx);
    	let if_block2 = /*num*/ ctx[4] == 2 && create_if_block_3$1(ctx);
    	let if_block3 = /*num*/ ctx[4] == 3 && create_if_block_1$1(ctx);

    	function select_block_type_4(ctx, dirty) {
    		if (/*num*/ ctx[4] == 4) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_4(ctx);
    	let if_block4 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			p = element("p");
    			t0 = text("Pontuação: ");
    			t1 = text(/*num*/ ctx[4]);
    			t2 = space();
    			h1 = element("h1");
    			h1.textContent = "Descubra o time";
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			if (if_block2) if_block2.c();
    			t7 = space();
    			if (if_block3) if_block3.c();
    			t8 = space();
    			if_block4.c();
    			t9 = space();
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = `${/*array*/ ctx[7][0][0]}`;
    			td1 = element("td");
    			td1.textContent = `${/*array*/ ctx[7][0][1]}`;
    			td2 = element("td");
    			td2.textContent = `${/*array*/ ctx[7][0][2]}`;
    			td3 = element("td");
    			td3.textContent = `${/*array*/ ctx[7][0][3]}`;
    			td4 = element("td");
    			td4.textContent = `${/*array*/ ctx[7][0][4]}`;
    			td5 = element("td");
    			td5.textContent = `${/*array*/ ctx[7][0][5]}`;
    			td6 = element("td");
    			td6.textContent = `${/*array*/ ctx[7][0][6]}`;
    			td7 = element("td");
    			td7.textContent = `${/*array*/ ctx[7][0][7]}`;
    			t18 = space();
    			tr1 = element("tr");
    			td8 = element("td");
    			td8.textContent = `${/*array*/ ctx[7][1][0]}`;
    			td9 = element("td");
    			td9.textContent = `${/*array*/ ctx[7][1][1]}`;
    			td10 = element("td");
    			td10.textContent = `${/*array*/ ctx[7][1][2]}`;
    			td11 = element("td");
    			td11.textContent = `${/*array*/ ctx[7][1][3]}`;
    			td12 = element("td");
    			td12.textContent = `${/*array*/ ctx[7][1][4]}`;
    			td13 = element("td");
    			td13.textContent = `${/*array*/ ctx[7][1][5]}`;
    			td14 = element("td");
    			td14.textContent = `${/*array*/ ctx[7][1][6]}`;
    			td15 = element("td");
    			td15.textContent = `${/*array*/ ctx[7][1][7]}`;
    			t27 = space();
    			tr2 = element("tr");
    			td16 = element("td");
    			td16.textContent = `${/*array*/ ctx[7][2][0]}`;
    			td17 = element("td");
    			td17.textContent = `${/*array*/ ctx[7][2][1]}`;
    			td18 = element("td");
    			td18.textContent = `${/*array*/ ctx[7][2][2]}`;
    			td19 = element("td");
    			td19.textContent = `${/*array*/ ctx[7][2][3]}`;
    			td20 = element("td");
    			td20.textContent = `${/*array*/ ctx[7][2][4]}`;
    			td21 = element("td");
    			td21.textContent = `${/*array*/ ctx[7][2][5]}`;
    			td22 = element("td");
    			td22.textContent = `${/*array*/ ctx[7][2][6]}`;
    			td23 = element("td");
    			td23.textContent = `${/*array*/ ctx[7][2][7]}`;
    			t36 = space();
    			tr3 = element("tr");
    			td24 = element("td");
    			td24.textContent = `${/*array*/ ctx[7][3][0]}`;
    			td25 = element("td");
    			td25.textContent = `${/*array*/ ctx[7][3][1]}`;
    			td26 = element("td");
    			td26.textContent = `${/*array*/ ctx[7][3][2]}`;
    			td27 = element("td");
    			td27.textContent = `${/*array*/ ctx[7][3][3]}`;
    			td28 = element("td");
    			td28.textContent = `${/*array*/ ctx[7][3][4]}`;
    			td29 = element("td");
    			td29.textContent = `${/*array*/ ctx[7][3][5]}`;
    			td30 = element("td");
    			td30.textContent = `${/*array*/ ctx[7][3][6]}`;
    			td31 = element("td");
    			td31.textContent = `${/*array*/ ctx[7][3][7]}`;
    			t45 = space();
    			tr4 = element("tr");
    			td32 = element("td");
    			td32.textContent = `${/*array*/ ctx[7][4][0]}`;
    			td33 = element("td");
    			td33.textContent = `${/*array*/ ctx[7][4][1]}`;
    			td34 = element("td");
    			td34.textContent = `${/*array*/ ctx[7][4][2]}`;
    			td35 = element("td");
    			td35.textContent = `${/*array*/ ctx[7][4][3]}`;
    			td36 = element("td");
    			td36.textContent = `${/*array*/ ctx[7][4][4]}`;
    			td37 = element("td");
    			td37.textContent = `${/*array*/ ctx[7][4][5]}`;
    			td38 = element("td");
    			td38.textContent = `${/*array*/ ctx[7][4][6]}`;
    			td39 = element("td");
    			td39.textContent = `${/*array*/ ctx[7][4][7]}`;
    			t54 = space();
    			tr5 = element("tr");
    			td40 = element("td");
    			td40.textContent = `${/*array*/ ctx[7][5][0]}`;
    			td41 = element("td");
    			td41.textContent = `${/*array*/ ctx[7][5][1]}`;
    			td42 = element("td");
    			td42.textContent = `${/*array*/ ctx[7][5][2]}`;
    			td43 = element("td");
    			td43.textContent = `${/*array*/ ctx[7][5][3]}`;
    			td44 = element("td");
    			td44.textContent = `${/*array*/ ctx[7][5][4]}`;
    			td45 = element("td");
    			td45.textContent = `${/*array*/ ctx[7][5][5]}`;
    			td46 = element("td");
    			td46.textContent = `${/*array*/ ctx[7][5][6]}`;
    			td47 = element("td");
    			td47.textContent = `${/*array*/ ctx[7][5][7]}`;
    			t63 = space();
    			div0 = element("div");
    			div0.textContent = "Retornar";
    			attr_dev(p, "class", "Pontuação svelte-122hi5e");
    			add_location(p, file$3, 59, 0, 1025);
    			attr_dev(h1, "class", "svelte-122hi5e");
    			add_location(h1, file$3, 60, 1, 1070);
    			add_location(td0, file$3, 114, 5, 2779);
    			add_location(td1, file$3, 114, 27, 2801);
    			add_location(td2, file$3, 114, 49, 2823);
    			add_location(td3, file$3, 114, 71, 2845);
    			add_location(td4, file$3, 114, 93, 2867);
    			add_location(td5, file$3, 114, 115, 2889);
    			add_location(td6, file$3, 114, 137, 2911);
    			add_location(td7, file$3, 114, 159, 2933);
    			add_location(tr0, file$3, 114, 1, 2775);
    			add_location(td8, file$3, 115, 5, 2967);
    			add_location(td9, file$3, 115, 27, 2989);
    			add_location(td10, file$3, 115, 49, 3011);
    			add_location(td11, file$3, 115, 71, 3033);
    			add_location(td12, file$3, 115, 93, 3055);
    			add_location(td13, file$3, 115, 115, 3077);
    			add_location(td14, file$3, 115, 137, 3099);
    			add_location(td15, file$3, 115, 159, 3121);
    			add_location(tr1, file$3, 115, 1, 2963);
    			add_location(td16, file$3, 116, 5, 3155);
    			add_location(td17, file$3, 116, 27, 3177);
    			add_location(td18, file$3, 116, 49, 3199);
    			add_location(td19, file$3, 116, 71, 3221);
    			add_location(td20, file$3, 116, 93, 3243);
    			add_location(td21, file$3, 116, 115, 3265);
    			add_location(td22, file$3, 116, 137, 3287);
    			add_location(td23, file$3, 116, 159, 3309);
    			add_location(tr2, file$3, 116, 1, 3151);
    			add_location(td24, file$3, 117, 5, 3343);
    			add_location(td25, file$3, 117, 27, 3365);
    			add_location(td26, file$3, 117, 49, 3387);
    			add_location(td27, file$3, 117, 71, 3409);
    			add_location(td28, file$3, 117, 93, 3431);
    			add_location(td29, file$3, 117, 115, 3453);
    			add_location(td30, file$3, 117, 137, 3475);
    			add_location(td31, file$3, 117, 159, 3497);
    			add_location(tr3, file$3, 117, 1, 3339);
    			add_location(td32, file$3, 118, 5, 3531);
    			add_location(td33, file$3, 118, 27, 3553);
    			add_location(td34, file$3, 118, 49, 3575);
    			add_location(td35, file$3, 118, 71, 3597);
    			add_location(td36, file$3, 118, 93, 3619);
    			add_location(td37, file$3, 118, 115, 3641);
    			add_location(td38, file$3, 118, 137, 3663);
    			add_location(td39, file$3, 118, 159, 3685);
    			add_location(tr4, file$3, 118, 1, 3527);
    			add_location(td40, file$3, 119, 5, 3719);
    			add_location(td41, file$3, 119, 27, 3741);
    			add_location(td42, file$3, 119, 49, 3763);
    			add_location(td43, file$3, 119, 71, 3785);
    			add_location(td44, file$3, 119, 93, 3807);
    			add_location(td45, file$3, 119, 115, 3829);
    			add_location(td46, file$3, 119, 137, 3851);
    			add_location(td47, file$3, 119, 159, 3873);
    			add_location(tr5, file$3, 119, 1, 3715);
    			attr_dev(table, "class", "tab svelte-122hi5e");
    			add_location(table, file$3, 113, 0, 2753);
    			attr_dev(div0, "class", "Retornar svelte-122hi5e");
    			add_location(div0, file$3, 123, 0, 3972);
    			attr_dev(div1, "id", "principal");
    			attr_dev(div1, "class", "svelte-122hi5e");
    			add_location(div1, file$3, 58, 0, 1001);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(div1, t2);
    			append_dev(div1, h1);
    			append_dev(div1, t4);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t5);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t6);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div1, t7);
    			if (if_block3) if_block3.m(div1, null);
    			append_dev(div1, t8);
    			if_block4.m(div1, null);
    			append_dev(div1, t9);
    			append_dev(div1, table);
    			append_dev(table, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, td1);
    			append_dev(tr0, td2);
    			append_dev(tr0, td3);
    			append_dev(tr0, td4);
    			append_dev(tr0, td5);
    			append_dev(tr0, td6);
    			append_dev(tr0, td7);
    			append_dev(table, t18);
    			append_dev(table, tr1);
    			append_dev(tr1, td8);
    			append_dev(tr1, td9);
    			append_dev(tr1, td10);
    			append_dev(tr1, td11);
    			append_dev(tr1, td12);
    			append_dev(tr1, td13);
    			append_dev(tr1, td14);
    			append_dev(tr1, td15);
    			append_dev(table, t27);
    			append_dev(table, tr2);
    			append_dev(tr2, td16);
    			append_dev(tr2, td17);
    			append_dev(tr2, td18);
    			append_dev(tr2, td19);
    			append_dev(tr2, td20);
    			append_dev(tr2, td21);
    			append_dev(tr2, td22);
    			append_dev(tr2, td23);
    			append_dev(table, t36);
    			append_dev(table, tr3);
    			append_dev(tr3, td24);
    			append_dev(tr3, td25);
    			append_dev(tr3, td26);
    			append_dev(tr3, td27);
    			append_dev(tr3, td28);
    			append_dev(tr3, td29);
    			append_dev(tr3, td30);
    			append_dev(tr3, td31);
    			append_dev(table, t45);
    			append_dev(table, tr4);
    			append_dev(tr4, td32);
    			append_dev(tr4, td33);
    			append_dev(tr4, td34);
    			append_dev(tr4, td35);
    			append_dev(tr4, td36);
    			append_dev(tr4, td37);
    			append_dev(tr4, td38);
    			append_dev(tr4, td39);
    			append_dev(table, t54);
    			append_dev(table, tr5);
    			append_dev(tr5, td40);
    			append_dev(tr5, td41);
    			append_dev(tr5, td42);
    			append_dev(tr5, td43);
    			append_dev(tr5, td44);
    			append_dev(tr5, td45);
    			append_dev(tr5, td46);
    			append_dev(tr5, td47);
    			append_dev(div1, t63);
    			append_dev(div1, div0);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler_4*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*num*/ 16) set_data_dev(t1, /*num*/ ctx[4]);

    			if (/*num*/ ctx[4] == 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					if_block0.m(div1, t5);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*num*/ ctx[4] == 1) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(div1, t6);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*num*/ ctx[4] == 2) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_3$1(ctx);
    					if_block2.c();
    					if_block2.m(div1, t7);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*num*/ ctx[4] == 3) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1$1(ctx);
    					if_block3.c();
    					if_block3.m(div1, t8);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_4(ctx)) && if_block4) {
    				if_block4.p(ctx, dirty);
    			} else {
    				if_block4.d(1);
    				if_block4 = current_block_type(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(div1, t9);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if_block4.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Jogar', slots, []);
    	var name = "";
    	var name1 = "";
    	var namex = "";
    	var namey = "";
    	var num = 0;
    	let errado = "Esta perto.....Será ????";

    	function cont() {
    		$$invalidate(4, num = num + 1);
    	}

    	let array = [
    		['x', 's', 'p', 'o', 'r', 't', 'h', 'x'],
    		['d', 'a', 'i', 'v', 'j', 'l', 'u', 'a'],
    		['c', 'n', 'z', 'r', 'a', 'l', 'm', 'e'],
    		['a', 't', 'l', 'e', 't', 'i', 'c', 'o'],
    		['f', 'o', 'y', 'm', 'w', 'g', 'u', 't'],
    		['r', 's', 'q', 'o', 'd', 'p', 'n', 'c']
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Jogar> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	const click_handler = () => cont();

    	function input_input_handler_1() {
    		name1 = this.value;
    		$$invalidate(1, name1);
    	}

    	const click_handler_1 = () => cont();

    	function input_input_handler_2() {
    		namex = this.value;
    		$$invalidate(2, namex);
    	}

    	const click_handler_2 = () => cont();

    	function input_input_handler_3() {
    		namey = this.value;
    		$$invalidate(3, namey);
    	}

    	const click_handler_3 = () => cont();
    	const click_handler_4 = () => trocarEstadoDoJogo('Menu');

    	$$self.$capture_state = () => ({
    		estado,
    		trocarEstadoDoJogo,
    		name,
    		name1,
    		namex,
    		namey,
    		num,
    		errado,
    		cont,
    		array
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('name1' in $$props) $$invalidate(1, name1 = $$props.name1);
    		if ('namex' in $$props) $$invalidate(2, namex = $$props.namex);
    		if ('namey' in $$props) $$invalidate(3, namey = $$props.namey);
    		if ('num' in $$props) $$invalidate(4, num = $$props.num);
    		if ('errado' in $$props) $$invalidate(5, errado = $$props.errado);
    		if ('array' in $$props) $$invalidate(7, array = $$props.array);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		name1,
    		namex,
    		namey,
    		num,
    		errado,
    		cont,
    		array,
    		input_input_handler,
    		click_handler,
    		input_input_handler_1,
    		click_handler_1,
    		input_input_handler_2,
    		click_handler_2,
    		input_input_handler_3,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class Jogar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jogar",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Menu.svelte generated by Svelte v3.55.1 */
    const file$2 = "src\\Menu.svelte";

    function create_fragment$3(ctx) {
    	let link;
    	let t0;
    	let h1;
    	let t2;
    	let div0;
    	let t4;
    	let div1;
    	let t6;
    	let div2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Caça Palavras";
    			t2 = space();
    			div0 = element("div");
    			div0.textContent = "Jogar";
    			t4 = space();
    			div1 = element("div");
    			div1.textContent = "Sobre";
    			t6 = space();
    			div2 = element("div");
    			div2.textContent = "Ajuda";
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "/src/menu.css");
    			add_location(link, file$2, 1, 1, 16);
    			attr_dev(h1, "class", "svelte-idz52k");
    			add_location(h1, file$2, 25, 0, 444);
    			attr_dev(div0, "class", "Menu svelte-idz52k");
    			add_location(div0, file$2, 29, 1, 533);
    			attr_dev(div1, "class", "Menu svelte-idz52k");
    			add_location(div1, file$2, 33, 1, 676);
    			attr_dev(div2, "class", "Menu svelte-idz52k");
    			add_location(div2, file$2, 37, 1, 819);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div2, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[0], false, false, false),
    					listen_dev(div1, "click", /*click_handler_1*/ ctx[1], false, false, false),
    					listen_dev(div2, "click", /*click_handler_2*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Menu', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => trocarEstadoDoJogo('Jogar');
    	const click_handler_1 = () => trocarEstadoDoJogo('Sobre');
    	const click_handler_2 = () => trocarEstadoDoJogo('Ajuda');
    	$$self.$capture_state = () => ({ estado, trocarEstadoDoJogo });
    	return [click_handler, click_handler_1, click_handler_2];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Sobre.svelte generated by Svelte v3.55.1 */
    const file$1 = "src\\Sobre.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let h1;
    	let t1;
    	let ls0;
    	let ol0;
    	let t3;
    	let ls1;
    	let ol1;
    	let t5;
    	let ls2;
    	let ol2;
    	let t7;
    	let ls3;
    	let ol3;
    	let t9;
    	let ls4;
    	let ol4;
    	let t11;
    	let h2;
    	let t13;
    	let p;
    	let t15;
    	let div0;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Alunos:";
    			t1 = space();
    			ls0 = element("ls");
    			ol0 = element("ol");
    			ol0.textContent = `${/*lista*/ ctx[0][0]}`;
    			t3 = space();
    			ls1 = element("ls");
    			ol1 = element("ol");
    			ol1.textContent = `${/*lista*/ ctx[0][1]}`;
    			t5 = space();
    			ls2 = element("ls");
    			ol2 = element("ol");
    			ol2.textContent = `${/*lista*/ ctx[0][2]}`;
    			t7 = space();
    			ls3 = element("ls");
    			ol3 = element("ol");
    			ol3.textContent = `${/*lista*/ ctx[0][3]}`;
    			t9 = space();
    			ls4 = element("ls");
    			ol4 = element("ol");
    			ol4.textContent = `${/*lista*/ ctx[0][4]}`;
    			t11 = space();
    			h2 = element("h2");
    			h2.textContent = "Professor:";
    			t13 = space();
    			p = element("p");
    			p.textContent = "Allan Lima";
    			t15 = space();
    			div0 = element("div");
    			div0.textContent = "Retornar";
    			attr_dev(h1, "class", "alunos svelte-x0q67h");
    			add_location(h1, file$1, 29, 2, 630);
    			add_location(ol0, file$1, 30, 4, 667);
    			add_location(ls0, file$1, 30, 0, 663);
    			add_location(ol1, file$1, 34, 4, 705);
    			add_location(ls1, file$1, 34, 0, 701);
    			add_location(ol2, file$1, 38, 4, 743);
    			add_location(ls2, file$1, 38, 0, 739);
    			add_location(ol3, file$1, 42, 4, 781);
    			add_location(ls3, file$1, 42, 0, 777);
    			add_location(ol4, file$1, 46, 4, 819);
    			add_location(ls4, file$1, 46, 0, 815);
    			add_location(h2, file$1, 50, 0, 853);
    			attr_dev(p, "class", "prof svelte-x0q67h");
    			add_location(p, file$1, 51, 0, 874);
    			attr_dev(div0, "class", "Sobre svelte-x0q67h");
    			add_location(div0, file$1, 53, 0, 964);
    			attr_dev(div1, "id", "prin");
    			add_location(div1, file$1, 28, 0, 612);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, ls0);
    			append_dev(ls0, ol0);
    			append_dev(div1, t3);
    			append_dev(div1, ls1);
    			append_dev(ls1, ol1);
    			append_dev(div1, t5);
    			append_dev(div1, ls2);
    			append_dev(ls2, ol2);
    			append_dev(div1, t7);
    			append_dev(div1, ls3);
    			append_dev(ls3, ol3);
    			append_dev(div1, t9);
    			append_dev(div1, ls4);
    			append_dev(ls4, ol4);
    			append_dev(div1, t11);
    			append_dev(div1, h2);
    			append_dev(div1, t13);
    			append_dev(div1, p);
    			append_dev(div1, t15);
    			append_dev(div1, div0);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Sobre', slots, []);

    	let lista = [
    		"Cidyclay Lacerda Monteiro Junyor",
    		"Marcio Rodrigues De Santanna    ",
    		"João Vitor Batista Rodrigues    ",
    		"    Iara Cristina                   ",
    		"       Samantha Cristina               "
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Sobre> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => trocarEstadoDoJogo('Menu');
    	$$self.$capture_state = () => ({ estado, trocarEstadoDoJogo, lista });

    	$$self.$inject_state = $$props => {
    		if ('lista' in $$props) $$invalidate(0, lista = $$props.lista);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [lista, click_handler];
    }

    class Sobre extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sobre",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Ajuda.svelte generated by Svelte v3.55.1 */
    const file = "src\\Ajuda.svelte";

    function create_fragment$1(ctx) {
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t5;
    	let p2;
    	let t7;
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Como jogar ?";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Olá jogar, para jogar este game, você irá digitar a";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "repostas da perguntas e como ajuda você irá utilizar";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "O caça palavras como base para achar as repostas e assim conseguir completar o game.";
    			t7 = space();
    			div = element("div");
    			div.textContent = "Voltar";
    			attr_dev(h1, "class", "svelte-8toq6l");
    			add_location(h1, file, 19, 0, 339);
    			attr_dev(p0, "class", "svelte-8toq6l");
    			add_location(p0, file, 22, 4, 374);
    			attr_dev(p1, "class", "svelte-8toq6l");
    			add_location(p1, file, 23, 4, 439);
    			attr_dev(p2, "class", "svelte-8toq6l");
    			add_location(p2, file, 24, 4, 504);
    			attr_dev(div, "class", "Voltar svelte-8toq6l");
    			add_location(div, file, 27, 0, 657);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*click_handler*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
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
    	validate_slots('Ajuda', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Ajuda> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => trocarEstadoDoJogo('Menu');
    	$$self.$capture_state = () => ({ estado, trocarEstadoDoJogo });
    	return [click_handler];
    }

    class Ajuda extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ajuda",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.55.1 */

    // (14:30) 
    function create_if_block_3(ctx) {
    	let ajuda;
    	let current;
    	ajuda = new Ajuda({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(ajuda.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(ajuda, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(ajuda.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(ajuda.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(ajuda, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(14:30) ",
    		ctx
    	});

    	return block;
    }

    // (12:30) 
    function create_if_block_2(ctx) {
    	let sobre;
    	let current;
    	sobre = new Sobre({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sobre.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sobre, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sobre.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sobre.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sobre, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(12:30) ",
    		ctx
    	});

    	return block;
    }

    // (10:30) 
    function create_if_block_1(ctx) {
    	let jogar;
    	let current;
    	jogar = new Jogar({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(jogar.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jogar, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jogar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jogar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jogar, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(10:30) ",
    		ctx
    	});

    	return block;
    }

    // (8:0) {#if $estado === 'Menu'}
    function create_if_block(ctx) {
    	let menu;
    	let current;
    	menu = new Menu({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(menu.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(menu, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(menu, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(8:0) {#if $estado === 'Menu'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$estado*/ ctx[0] === 'Menu') return 0;
    		if (/*$estado*/ ctx[0] === 'Jogar') return 1;
    		if (/*$estado*/ ctx[0] === 'Sobre') return 2;
    		if (/*$estado*/ ctx[0] === 'Ajuda') return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
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
    	let $estado;
    	validate_store(estado, 'estado');
    	component_subscribe($$self, estado, $$value => $$invalidate(0, $estado = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Jogar,
    		Menu,
    		estado,
    		Sobre,
    		Ajuda,
    		$estado
    	});

    	return [$estado];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
